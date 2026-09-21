import {
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Typography,
  Card,
  CardContent,
  CardActions,
  CardMedia,
} from '@mui/material';
import './Hero.scss';
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
const Hero = () => {
  const navigate = useNavigate();
  return (
    <Container
      maxWidth="lg"
      sx={{
        display: { md: 'flex', xs: 'block' },
        marginTop: { xl: 0, xs: 5 },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        height: { xl: 'calc(100vh - 78px)', xs: 'auto' },
        marginBottom: { md: 0, xs: '40px' },
      }}
    >
      <Stack
        sx={{
          justifyContent: 'Center',
          width: '100%',
          maxWidth: { lg: '550px', xs: '470px' },
          margin: { xs: '0 auto', md: 'auto' },
        }}
      >
        <Typography
          // variant="h1"
          // fontSize={{ xs: '32px', md: '50px', lg: '64px' }} // old onces
          // lineHeight={{ xs: '37px', md: '55px', lg: '75px' }}

          variant="h1"
          fontSize={{ xs: '30px', md: '40px', lg: '54px' }}
          lineHeight={{ xs: '27px', md: '45px', lg: '55px' }}
        >
          AI Image and Video Generator for <br className="d-block d-sm-none" />{' '}
          Commerce Merchants and Creators
        </Typography>
        <Typography
          fontSize={{ xs: '16px', md: '18px', lg: '20px' }}
          variant="h6"
          mb="28px"
          mt="15px"
        >
          Generate and share high-quality product images and videos instantly
          using our AI tools. Designed for <br className="banner-line-break" />{' '}
          e-commerce brands, agencies, and creators.
        </Typography>
        <Button
          onClick={() => {
            navigate('/signup');
          }}
          size="medium"
          variant="contained"
          sx={{
            background: '#1b1b1b',
            color: '#FFF',
            width: 'max-content',
            margin: { md: '0 0 78px 0', xs: '0 auto 30px' },
            fontSize: { md: 18, xs: 14 },
          }}
        >
          Sign Up
        </Button>
        <Stack
          direction="horizontal"
          alignItems="center"
          gap={2}
          sx={{ marginBottom: { md: 2, xs: '60px' } }}
        >
          <Typography variant="h6" fontSize={{ md: 20, xs: 16 }}>
            Integrated with
          </Typography>

          <a href="https://apps.shopify.com/">
            <IconButton sx={{ width: { md: 32, xs: 21 }, padding: 0 }}>
              <img
                src={'/assets/images/social-icons/shopify-1.png'}
                alt=""
                width="100%"
              />
            </IconButton>
          </a>
          <a href="https://www.tiktok.com/">
            <IconButton sx={{ width: { md: 30, xs: 20 }, padding: 0 }}>
              <img
                src={'/assets/images/social-icons/tiktok-icon-2-1.png'}
                alt=""
                width="100%"
              />
            </IconButton>
          </a>
          <a href="https://www.instagram.com/">
            <IconButton sx={{ width: { md: 35, xs: 24 }, padding: 0 }}>
              <img
                src={'/assets/images/social-icons/instagram-2016-5-1.png'}
                alt=""
                width="100%"
              />
            </IconButton>
          </a>
          <a href="https://www.linkedin.com">
            <IconButton sx={{ width: { md: 42, xs: 28 }, padding: 0 }}>
              <img
                src={'/assets/images/social-icons/icons8-linkedin-32.svg'}
                alt=""
                width="100%"
              />
            </IconButton>
          </a>
          <a href="https://twitter.com">
            <IconButton sx={{ width: { md: 32, xs: 20 }, padding: 0 }}>
              <img
                src={'/assets/images/social-icons/twitter-color.png'}
                alt=""
                width="100%"
              />
            </IconButton>
          </a>
          <a href="https://www.facebook.com">
            <IconButton sx={{ width: { md: 32, xs: 22 }, padding: 0 }}>
              <img
                src={'/assets/images/social-icons/facebook.svg'}
                alt=""
                width="100%"
              />
            </IconButton>
          </a>
        </Stack>
      </Stack>

      <Stack
        sx={{
          justifyContent: 'center',
          maxWidth: '570px',
          position: 'relative',
          width: '100%',
          margin: { xs: '0 auto', md: 'auto' },
          marginLeft: 'auto',
          paddingBottom: '80px',
          paddingTop: '40px',
        }}
      >
        <Box
          className="hero-video"
          sx={{
            borderRadius: '20px',
            height: 'auto',
            maxWidth: '540px',
            position: 'relative',
          }}
        >
          <Box
            className="bg-overlay"
            sx={{
              position: 'absolute',
              top: -40,
              left: -40,
              width: '116%',
              height: '90%',
              background: 'rgba(255, 255, 255, 0.30)',
              backdropFilter: 'blur(2px)',
              zIndex: 0, // Place it behind the video
              borderRadius: '20px', // Match the video's border radius
            }}
          ></Box>

 
        </Box>

        <Card
          sx={{
            display: 'flex',
            width: { sm: '95%', xs: '100%' },
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '20px',
            boxShadow:
              '3.302685260772705px 6.60537052154541px 33.026851654052734px 0px #AAAAAA40',
            borderRadius: '12px',
            padding: '10px 10px',
          }}
        >
          <CardContent sx={{}}>
            <Typography
              sx={{ fontSize: 16, opacity: '50%', color: '#777777' }}
              gutterBottom
            >
              Describe the scene around your product...
            </Typography>
          </CardContent>
          <CardActions sx={{ paddingX: '17px', justifyContent: 'center' }}>
            <Link to="/dashboard/text-to-image">
              <Button
                variant="contained"
                sx={{
                  color: 'white',
                  background: '#837EFF',
                  width: '170px',
                  paddingY: '4px',
                  fontSize: '19px',
                }}
                size="medium"
              >
                Generate
              </Button>
            </Link>
          </CardActions>
        </Card>
      </Stack>
    </Container>
  );
};

export default Hero;
