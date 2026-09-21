import { Box, Button, Container, Stack, Typography } from '@mui/material';
import React from 'react';
import SingleProductSection from './SingleProductSection';

const ProductsSection = () => {
  return (
    <Container maxWidth="lg">
      <SingleProductSection
        title="Generate new backgrounds in seconds"
        description="Easily upload or select an image of your product and our system will automatically remove the existing background. Generate new high-quality backgrounds in seconds by simply describing the scene surrounding your product exactly as you want - no sets needed!"
        imgSrc="/assets/images/landing-product-2.png"
        direction="rtl"
      />
      <SingleProductSection
        title="Create new product photos instantly"
        description="Generate visual inspiration for your next product line. Imagine the product you want to sell, and create an image instantly by describing your vision and key features. "
        imgSrc="/assets/images/landing-product-7.png"
        direction="ltr"
      />

      <SingleProductSection
        title="Enhance your photos using editor tools"
        description="Customize your generated photos with creator editing tools to make sure they're designed exactly as you want. Easily add brand elements, styling, promotional messaging, and more."
        imgSrc="/assets/images/landing-product-4.png"
        direction="rtl"
      />
      <SingleProductSection
        title="Create videos in a few clicks"
        description="Turn your ideas into videos using our text-to-video AI tool. Just describe the video you want to create and watch the magic happen. Ready to share as ads or organic content on your website and social channels."
        imgSrc="/assets/images/landing-product-6.png"
        direction="ltr"
        showBeta={true}
      />
      <SingleProductSection
        title="Generate captions and easily share across channels"
        description="Easily optimize aspect ratios, add captions or descriptions, and share your new photos and videos directly on your website and social channels. Our Shopify app even directly integrates with your store admin!"
        imgSrc="/assets/images/landing-product-5.png"
        direction="rtl"
      />
    </Container>
  );
};

export default ProductsSection;
