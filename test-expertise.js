const HugoExpertise = require('./src/hugo-expertise');

const expert = new HugoExpertise();

const tests = [
  "I need API documentation with search",
  "Building a personal blog about cooking",
  "Technical documentation for our REST API"
];

tests.forEach(desc => {
  const type = expert.analyzeDescription(desc);
  const theme = expert.recommendTheme(type);
  console.log(`\nDescription: "${desc}"`);
  console.log(`Type: ${type}, Recommended theme: ${theme}`);
});