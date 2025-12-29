import axios, { AxiosError } from 'axios';
import { FacebookAccount, Content, Earning, Analytics } from '../models';
import { AppError, ExternalServiceError, RateLimitError, AuthenticationError } from '../errors';
import { handleAxiosError, withRetry } from '../utils/errorHelpers';

export class FacebookService {
  private static readonly GRAPH_API_URL = 'https://graph.facebook.com/v18.0';
  private static readonly TIMEOUT = 30000;

  static async exchangeCodeForToken(code: string, redirectUri: string) {
    try {
      const response = await withRetry(
        () => axios.get(`${this.GRAPH_API_URL}/oauth/access_token`, {
          params: {
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            redirect_uri: redirectUri,
            code,
          },
          timeout: this.TIMEOUT,
        }),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
        }
      );

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error, 'Facebook OAuth');
      }
      throw new ExternalServiceError(`Facebook token exchange failed: ${error.message}`, { service: 'Facebook' });
    }
  }

  static async getUserProfile(accessToken: string) {
    try {
      const response = await withRetry(
        () => axios.get(`${this.GRAPH_API_URL}/me`, {
          params: {
            fields: 'id,name,email,picture',
            access_token: accessToken,
          },
          timeout: this.TIMEOUT,
        }),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
        }
      );

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error, 'Facebook Graph API');
      }
      throw new ExternalServiceError(`Failed to get Facebook user profile: ${error.message}`, { service: 'Facebook' });
    }
  }

  static async getPageAccessToken(userId: string, accessToken: string, pageId: string) {
    try {
      const response = await withRetry(
        () => axios.get(
          `${this.GRAPH_API_URL}/${userId}/accounts`,
          {
            params: {
              access_token: accessToken,
            },
            timeout: this.TIMEOUT,
          }
        ),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
        }
      );

      const page = response.data.data.find((p: any) => p.id === pageId);
      return page?.access_token || null;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error, 'Facebook Graph API');
      }
      throw new ExternalServiceError(`Failed to get page access token: ${error.message}`, { service: 'Facebook' });
    }
  }

  static async getPageInsights(pageId: string, accessToken: string, metric: string) {
    try {
      const response = await withRetry(
        () => axios.get(
          `${this.GRAPH_API_URL}/${pageId}/insights`,
          {
            params: {
              metric,
              access_token: accessToken,
            },
            timeout: this.TIMEOUT,
          }
        ),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
        }
      );

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error, 'Facebook Insights API');
      }
      throw new ExternalServiceError(`Failed to get page insights: ${error.message}`, { service: 'Facebook', pageId, metric });
    }
  }

  static async getContentList(pageId: string, accessToken: string) {
    try {
      const response = await withRetry(
        () => axios.get(
          `${this.GRAPH_API_URL}/${pageId}/posts`,
          {
            params: {
              fields: 'id,message,created_time,full_picture,type,permalink_url',
              access_token: accessToken,
            },
            timeout: this.TIMEOUT,
          }
        ),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
        }
      );

      return response.data.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error, 'Facebook Posts API');
      }
      throw new ExternalServiceError(`Failed to get content list: ${error.message}`, { service: 'Facebook', pageId });
    }
  }

  static async getVideoInsights(videoId: string, accessToken: string) {
    try {
      const response = await withRetry(
        () => axios.get(
          `${this.GRAPH_API_URL}/${videoId}/video_insights`,
          {
            params: {
              metric: 'total_video_views,total_video_impressions,total_video_ad_break_earnings',
              access_token: accessToken,
            },
            timeout: this.TIMEOUT,
          }
        ),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
        }
      );

      return response.data.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error, 'Facebook Video API');
      }
      throw new ExternalServiceError(`Failed to get video insights: ${error.message}`, { service: 'Facebook', videoId });
    }
  }

  static async publishPost(
    pageId: string,
    accessToken: string,
    message: string,
    mediaUrl?: string
  ) {
    try {
      const params: any = {
        message,
        access_token: accessToken,
      };

      if (mediaUrl) {
        params.url = mediaUrl;
      }

      const response = await withRetry(
        () => axios.post(
          `${this.GRAPH_API_URL}/${pageId}/photos`,
          null,
          { params, timeout: this.TIMEOUT }
        ),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
        }
      );

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new AuthenticationError(
            'Facebook page access token expired or invalid. Please reconnect your account.',
            { pageId }
          );
        }
        handleAxiosError(error, 'Facebook Publish API');
      }
      throw new ExternalServiceError(`Failed to publish post: ${error.message}`, { service: 'Facebook', pageId });
    }
  }

  static async syncAccountData(accountId: string) {
    try {
      const account = await FacebookAccount.findByPk(accountId);
      
      if (!account || !account.pageId || !account.pageAccessToken) {
        throw new AppError('Account not found or not configured', 400, true, { 
          accountId,
          hasAccount: !!account,
          hasPageId: !!account?.pageId,
          hasAccessToken: !!account?.pageAccessToken,
        });
      }

      const posts = await this.getContentList(account.pageId, account.pageAccessToken);
      
      let syncedCount = 0;
      for (const post of posts) {
        try {
          await Content.findOrCreate({
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
          syncedCount++;
        } catch (error: any) {
          console.error(`Failed to sync post ${post.id}:`, error.message);
        }
      }

      return { synced: syncedCount, total: posts.length };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new ExternalServiceError(`Failed to sync account data: ${error.message}`, { accountId });
    }
  }

  static async getMonetizationStatus(pageId: string, accessToken: string) {
    try {
      const response = await withRetry(
        () => axios.get(
          `${this.GRAPH_API_URL}/${pageId}`,
          {
            params: {
              fields: 'is_eligible_for_branded_content,fan_count',
              access_token: accessToken,
            },
            timeout: this.TIMEOUT,
          }
        ),
        {
          maxAttempts: 2,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(`Failed to get monetization status for page ${pageId}:`, error.message);
      return null;
    }
  }
}
