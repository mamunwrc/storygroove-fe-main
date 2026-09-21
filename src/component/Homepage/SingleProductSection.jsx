import { Box, Button, Container, Stack, Typography } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';

const SingleProductSection = ({ 
  title, 
  description, 
  imgSrc, 
  direction, 
  showBeta = false 
}) => {
  const navigate = useNavigate();
  return (
    <Box
      display={{ md: 'grid', xs: 'block' }}
      alignItems="center"
      padding={{ md: '70px 0 60px 0', xs: '30px 0 20px 0' }}
      gridTemplateColumns="minmax(370px, 35%) 1fr"
      sx={{ direction: direction }}
      gap={5}
    >
      <Stack
        sx={{
          justifyContent: 'Center',
          width: '100%',
          maxWidth: '550px',
          margin: { xs: '0 auto', md: 'auto' },
        }}
      >
        <Typography
          variant="h2"
          fontSize={{ xs: '26px', md: '48px' }}
          lineHeight={{ xs: '30px', md: '56px' }}
          sx={{ direction: 'ltr' }}
        >
          {title}
          {  showBeta ?  
                      <>
                      &nbsp;
                      <span style={{background: '#7FC9C7',borderRadius: '20px',padding: '3px 7px',color: '#fff',fontSize: '20px',fontStyle: 'italic',width: 118}}> 
                            BETA
                      </span>
                      </> : 
                      <></>
          }
        </Typography>
        <Typography
          fontSize={{ xs: '14px', md: '20px' }}
          lineHeight={{ xs: '16px', md: '23px' }}
          sx={{ direction: 'ltr' }}
          variant="h6"
          mb={{ md: '32px', xs: '10px' }}
          mt="15px"
        >
          {description}
        </Typography>
        <Button
          onClick={() => {
            navigate('/signup');
          }}
          size="medium"
          variant="contained"
          sx={{
            fontSize: { md: 18, xs: 14 },
            background: '#1b1b1b',
            color: '#FFF',
            mb: { sm: '80px', xs: '40px' },
            width: 'max-content',
            marginTop: { md: '27px', xs: '10px' },
            marginRight: direction == 'rtl' ? 'auto!important' : 0,
          }}
        >
          Sign Up
        </Button>
      </Stack>

      <Stack
        maxWidth={760}
        marginLeft={direction == 'ltr' ? 'auto' : 0}
        marginRight={direction == 'rtl' ? 'auto' : 0}
      >
        <img width="100%" src={imgSrc} alt="" />
      </Stack>
    </Box>
  );
};

export default SingleProductSection;
