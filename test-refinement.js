// Test script to demonstrate user input refinement
const { refineUserInput, refineComplexObject } = require('./services/groqService');

async function testRefinement() {
  console.log('🧪 Testing User Input Refinement...\n');

  // Test basic product name refinement
  console.log('1. Product Name Refinement:');
  const originalProductName = "my cool ai tool";
  const context = {
    companyName: "TechCorp",
    domain: "techcorp.com"
  };
  
  try {
    const refined = await refineUserInput('productName', originalProductName, context);
    console.log(`Original: "${originalProductName}"`);
    console.log(`Refined:  "${refined.data}"\n`);
  } catch (error) {
    console.log('Error refining product name:', error.message);
  }

  // Test value proposition refinement
  console.log('2. Value Proposition Refinement:');
  const originalValueProp = "we help companies do stuff better with ai";
  
  try {
    const refined = await refineUserInput('valueProposition', originalValueProp, context);
    console.log(`Original: "${originalValueProp}"`);
    console.log(`Refined:  "${refined.data}"\n`);
  } catch (error) {
    console.log('Error refining value proposition:', error.message);
  }

  // Test array refinement
  console.log('3. Pain Points Array Refinement:');
  const originalPainPoints = [
    "things are slow",
    "costs too much money",
    "hard to use",
    "breaks all the time"
  ];
  
  try {
    const refined = await refineUserInput('batchTextArray', originalPainPoints, { 
      ...context, 
      itemType: 'painPoints',
      personaTitle: 'VP of Engineering'
    });
    console.log('Original Pain Points:');
    originalPainPoints.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
    console.log('\nRefined Pain Points:');
    refined.data.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
    console.log();
  } catch (error) {
    console.log('Error refining pain points:', error.message);
  }

  // Test complex object refinement
  console.log('4. Complex Product Object Refinement:');
  const originalProduct = {
    name: "ai automation platform",
    description: "helps companies automate stuff",
    valueProposition: "save time and money",
    features: ["ai powered", "easy to use", "fast setup"],
    problems: ["manual work takes forever", "employees hate repetitive tasks"]
  };
  
  try {
    const refined = await refineComplexObject('product', originalProduct, context);
    console.log('Original Product:');
    console.log(JSON.stringify(originalProduct, null, 2));
    console.log('\nRefined Product:');
    console.log(JSON.stringify(refined.data, null, 2));
  } catch (error) {
    console.log('Error refining product object:', error.message);
  }
}

// Only run if called directly (not when imported)
if (require.main === module) {
  testRefinement().catch(console.error);
}

module.exports = { testRefinement }; 