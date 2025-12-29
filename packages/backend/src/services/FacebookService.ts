import axios from 'axios';
import { FacebookAccount, Content, Earning, Analytics } from '../models';
import { retryExternalAPICall } from '../utils/retry';
import { Logger } from '../utils/logger';
import { FacebookAPIError } from '../utils/customErrors';

const logger = Logger.getInstance();

export class FacebookService {
  private static readonly GRAPH_API_URL = 'https://graph.facebook.com/v18.0';
  private static readonly TIMEOUT_MS = 30000; // 30 seconds timeout

  /**
   * Makes a request to Facebook Graph API with error handling and retries
   */
  private static async makeRequest<T>(
    method: 'GET' | 'POST',
    url: string,
    options: any = {},
    operationName: string
  ): Promise<T> {
    const config = {
      method,
      url,
      timeout: this.TIMEOUT_MS,
      ...options,
      headers: {
        ...options.headers,
        'User-Agent': 'FacebookEarningsPlatform/1.0'
      }
    };

    try {
      const response = await retryExternalAPICall(
        async () => {
          logger.info(`Making Facebook API request: ${operationName}`);
          return axios.request(config);
        },
        operationName,
        3 // Max 3 retries
      );

      logger.info(`Facebook API request successful: ${operationName}`);
      return response.data;
    } catch (error: any) {
      logger.error(`Facebook API request failed: ${operationName}`, { error });
      
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorType = error.response?.data?.error?.type || 'Unknown';

      // Handle specific error types
      if (statusCode === 401 || errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        throw new FacebookAPIError('Authentication token expired or invalid. Please reconnect your Facebook account.', 401, error);
      }

      if (statusCode === 403) {
        throw new FacebookAPIError('Access denied. Please check your Facebook permissions.', 403, error);
      }

      if (statusCode === 429) {
        throw new FacebookAPIError('Rate limit exceeded. Please try again later.', 429, error);
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new FacebookAPIError('Request timed out. Please check your network connection.', 504, error);
      }

      throw new FacebookAPIError(
        `Facebook API error: ${errorMessage}`,
        statusCode || 500,
        error
      );
    }
  }

  static async exchangeCodeForToken(code: string, redirectUri: string) {
    logger.info('Exchanging code for Facebook token');
    
    try {
      const result = await this.makeRequest(
        'GET',
        `${this.GRAPH_API_URL}/oauth/access_token`,
        {
          params: {
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            redirect_uri: redirectUri,
            code,
          },
        },
        'exchangeCodeForToken'
      );

      return result;
    } catch (error) {
      logger.error('Failed to exchange code for token', { error });
      throw error;
    }
  }

  static async getUserProfile(accessToken: string) {
    logger.info('Fetching Facebook user profile');
    
    return this.makeRequest(
      'GET',
      `${this.GRAPH_API_URL}/me`,
      {
        params: {
          fields: 'id,name,email,picture',
          access_token: accessToken,
        },
      },
      'getUserProfile'
    );
  }

  static async getPageAccessToken(userId: string, accessToken: string, pageId: string) {
    logger.info(`Fetching page access token for page ${pageId}`);
    
    const response = await this.makeRequest(
      'GET',
      `${this.GRAPH_API_URL}/${userId}/accounts`,
      {
        params: {
          access_token: accessToken,
        },
      },
      'getPageAccessToken'
    );

    const page = response.data.find((p: any) => p.id === pageId);
    
    if (!page) {
      throw new FacebookAPIError(`Page ${pageId} not found or you don't have access to it`, 404);
    }

    return page.access_token;
  }

  static async getPageInsights(pageId: string, accessToken: string, metric: string) {
    logger.info(`Fetching page insights for page ${pageId}`);
    
    return this.makeRequest(
      'GET',
      `${this.GRAPH_API_URL}/${pageId}/insights`,
      {
        params: {
          metric,
          access_token: accessToken,
        },
      },
      'getPageInsights'
    );
  }

  static async getContentList(pageId: string, accessToken: string) {
    logger.info(`Fetching content list for page ${pageId}`);
    
    return this.makeRequest(
      'GET',
      `${this.GRAPH_API_URL}/${pageId}/posts`,
      {
        params: {
          fields: 'id,message,created_time,full_picture,type,permalink_url',
          access_token: accessToken,
        },
      },
      'getContentList'
    );
  }

  static async getVideoInsights(videoId: string, accessToken: string) {
    logger.info(`Fetching video insights for video ${videoId}`);
    
    return this.makeRequest(
      'GET',
      `${this.GRAPH_API_URL}/${videoId}/video_insights`,
      {
        params: {
          metric: 'total_video_views,total_video_impressions,total_video_ad_break_earnings',
          access_token: accessToken,
        },
      },
      'getVideoInsights'
    );
  }

  static async publishPost(
    pageId: string,
    accessToken: string,
    message: string,
    mediaUrl?: string
  ) {
    logger.info(`Publishing post to page ${pageId}`);
    
    const params: any = {
      message,
      access_token: accessToken,
    };

    if (mediaUrl) {
      params.url = mediaUrl;
    }

    return this.makeRequest(
      'POST',
      `${this.GRAPH_API_URL}/${pageId}/photos`,
      { params },
      'publishPost'
    );
  }

  static async syncAccountData(accountId: string) {
    logger.info(`Syncing account data for account ${accountId}`);
    
    const account = await FacebookAccount.findByPk(accountId);
    
    if (!account || !account.pageId || !account.pageAccessToken) {
      throw new FacebookAPIError('Account not found or not configured', 400);
    }

    try {
      const posts = await this.getContentList(account.pageId, account.pageAccessToken);
      
      let syncedCount = 0;
      for (const post of posts.data || []) {
        try {
          const [content, created] = await Content.findOrCreate({
            where: {
              facebookAccountId: accountId,
              contentId: post.id,
            },
            defaults: {
              contentType: post.type === 'video' ? 'video' : 'post',
              description: post.message,
              thumbnailUrl: post.full_picture,
              contentUrl: post.permalink_url,
              publishedAt: new Date(post.created_time),
            },
          });
          
          if (created) syncedCount++;
        } catch (syncError) {
          logger.error(`Failed to sync individual post ${post.id}`, { error: syncError });
          // Continue syncing other posts
        }
      }

      logger.info(`Successfully synced ${syncedCount} new posts for account ${accountId}`);
      return { synced: posts.data?.length || 0, new: syncedCount };
    } catch (error) {
      logger.error(`Failed to sync account data for ${accountId}`, { error });
      throw error;
    }
  }

  static async getMonetizationStatus(pageId: string, accessToken: string) {
    logger.info(`Fetching monetization status for page ${pageId}`);
    
    try {
      const response = await this.makeRequest(
        'GET',
        `${this.GRAPH_API_URL}/${pageId}`,
        {
          params: {
            fields: 'is_eligible_for_branded_content,fan_count',
            access_token: accessToken,
          },
        },
        'getMonetizationStatus'
      );

      return response;
    } catch (error) {
      // Return null for monetization status failures (it's not critical)
      logger.warn('Failed to fetch monetization status', { error, pageId });
      return null;
    }
  }
}