const mongoose = require('mongoose');
const HomepageCategory = require('../src/models/HomepageCategory');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/idea-design', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const generateSlugs = async () => {
  try {
    // Get all homepage categories
    const categories = await HomepageCategory.find({});
    console.log(`Found ${categories.length} categories`);

    // Update each category
    for (const category of categories) {
      // Generate slug from title
      const slug = category.title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Update category with new slug
      await HomepageCategory.findByIdAndUpdate(category._id, { slug: slug });
      console.log(`Updated category "${category.title}" with slug "${slug}"`);
    }

    console.log('All categories updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating categories:', error);
    process.exit(1);
  }
};

generateSlugs(); 