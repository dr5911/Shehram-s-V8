import axios from 'axios';
import { FacebookAccount, Content, Earning, Analytics } from '../models';

export class FacebookService {
  private static readonly GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

  static async exchangeCodeForToken(code: string, redirectUri: string) {
    const response = await axios.get(`${this.GRAPH_API_URL}/oauth/access_token`, {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      },
    });

    return response.data;
  }

  static async getUserProfile(accessToken: string) {
    const response = await axios.get(`${this.GRAPH_API_URL}/me`, {
      params: {
        fields: 'id,name,email,picture',
        access_token: accessToken,
      },
    });

    return response.data;
  }

  static async getPageAccessToken(userId: string, accessToken: string, pageId: string) {
    const response = await axios.get(
      `${this.GRAPH_API_URL}/${userId}/accounts`,
      {
        params: {
          access_token: accessToken,
        },
      }
    );

    const page = response.data.data.find((p: any) => p.id === pageId);
    return page?.access_token || null;
  }

  static async getPageInsights(pageId: string, accessToken: string, metric: string) {
    const response = await axios.get(
      `${this.GRAPH_API_URL}/${pageId}/insights`,
      {
        params: {
          metric,
          access_token: accessToken,
        },
      }
    );

    return response.data;
  }

  static async getContentList(pageId: string, accessToken: string) {
    const response = await axios.get(
      `${this.GRAPH_API_URL}/${pageId}/posts`,
      {
        params: {
          fields: 'id,message,created_time,full_picture,type,permalink_url',
          access_token: accessToken,
        },
      }
    );

    return response.data.data;
  }

  static async getVideoInsights(videoId: string, accessToken: string) {
    const response = await axios.get(
      `${this.GRAPH_API_URL}/${videoId}/video_insights`,
      {
        params: {
          metric: 'total_video_views,total_video_impressions,total_video_ad_break_earnings',
          access_token: accessToken,
        },
      }
    );

    return response.data.data;
  }

  static async publishPost(
    pageId: string,
    accessToken: string,
    message: string,
    mediaUrl?: string
  ) {
    const params: any = {
      message,
      access_token: accessToken,
    };

    if (mediaUrl) {
      params.url = mediaUrl;
    }

    const response = await axios.post(
      `${this.GRAPH_API_URL}/${pageId}/photos`,
      null,
      { params }
    );

    return response.data;
  }

  static async syncAccountData(accountId: string) {
    const account = await FacebookAccount.findByPk(accountId);
    
    if (!account || !account.pageId || !account.pageAccessToken) {
      throw new Error('Account not found or not configured');
    }

    const posts = await this.getContentList(account.pageId, account.pageAccessToken);
    
    for (const post of posts) {
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
    }

    return { synced: posts.length };
  }

  static async getMonetizationStatus(pageId: string, accessToken: string) {
    try {
      const response = await axios.get(
        `${this.GRAPH_API_URL}/${pageId}`,
        {
          params: {
            fields: 'is_eligible_for_branded_content,fan_count',
            access_token: accessToken,
          },
        }
      );

      return response.data;
    } catch (error) {
      return null;
    }
  }
}
