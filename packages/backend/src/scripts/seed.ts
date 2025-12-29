import sequelize from '../config/database';
import { User, FacebookAccount, Earning, TrendResearch } from '../models';

const seed = async () => {
  try {
    console.log('Seeding database...');
    
    await sequelize.authenticate();

    const admin = await User.create({
      email: 'admin@example.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });

    const user = await User.create({
      email: 'user@example.com',
      password: 'user123',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
    });

    console.log('Created users');

    const sampleTrends = [
      {
        topic: 'AI in Social Media',
        category: 'technology',
        description: 'How artificial intelligence is transforming social media marketing and content creation',
        trendScore: 95,
        suggestedHashtags: ['#AI', '#SocialMedia', '#Marketing', '#Technology', '#Innovation'],
        relatedTopics: ['Machine Learning', 'Automation', 'Content Creation'],
        contentSuggestion: 'Create posts about AI tools that help content creators',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        topic: 'Short-form Video Content',
        category: 'content',
        description: 'The rise of short-form video content on social platforms',
        trendScore: 88,
        suggestedHashtags: ['#Reels', '#Shorts', '#VideoContent', '#SocialMedia', '#ContentCreator'],
        relatedTopics: ['Instagram Reels', 'TikTok', 'YouTube Shorts'],
        contentSuggestion: 'Share tips for creating engaging short-form videos',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        topic: 'Social Commerce',
        category: 'business',
        description: 'Shopping directly on social media platforms is becoming mainstream',
        trendScore: 82,
        suggestedHashtags: ['#SocialCommerce', '#ECommerce', '#OnlineShopping', '#Business', '#Sales'],
        relatedTopics: ['Instagram Shopping', 'Facebook Shops', 'Live Shopping'],
        contentSuggestion: 'Discuss how businesses can leverage social commerce',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const trend of sampleTrends) {
      await TrendResearch.create(trend);
    }

    console.log('Created sample trends');
    console.log('Seeding completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
