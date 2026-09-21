import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Container,
  Divider,
  Grid,
  Icon,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { useQuery, useMutation } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { BsCheckCircleFill } from 'react-icons/bs';
import { MdOutlineCancel } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import { getSubscriptionPlansAPIV2 } from '../../api/subscriptions';
import { buildFeaturesArray } from '../../Common/Subscriptions';
import { SubscriptionCard } from '../../component/Subscriptions/SubscriptionCard';
import { setRedirectURL } from '../../utils';

const PricingPlans = React.forwardRef((props, ref) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [subscriptions, setSubscriptions] = useState([]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: '', //getSubscriptionPlansAPIV2
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!isLoading) {
      setSubscriptions(
        data.map((subscription) => {
          return {
            ...subscription,
            features: buildFeaturesArray(subscription),
          };
        })
      );
    }
  }, [isLoading]);

  const choosePlanHandler = (priceId) => {
    const isUserLoggedIn = localStorage.getItem('userToken') ? true : false;
    if (!isUserLoggedIn) {
      navigate('/login'); // after logging in with no plan, they'll be taken to the userprofile area immediately
    } else {
      navigate('/dashboard/userprofile?tab=subscription');
    }
  };

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Box ref={ref} sx={{ background: '#f8f8f8' }}>
        <Container maxWidth="xl">
          <Container
            disableGutters
            maxWidth="xl"
            sx={{ pt: '60px', pb: { md: 6, xs: 3 } }}
          >
            <Typography
              component="h2"
              variant="h2"
              align="center"
              color="text.primary"
              gutterBottom
              sx={{ fontSize: { sm: 48, xs: 26 } }}
            >
              Pricing Plans
            </Typography>
            <Typography
              variant="h6"
              align="center"
              sx={{ fontSize: { sm: 20, xs: 14 } }}
            >
              Level up the way you create content
            </Typography>
          </Container>
          {/* End hero unit */}
          <Container
            maxWidth="xl"
            sx={{ pb: '60px', paddingLeft: 0, paddingRight: 0 }}
          >
            <Grid container spacing={5} alignItems="stretch">
              {!isLoading &&
                subscriptions.map((subscription) => (
                  <Grid
                    item
                    key={subscription.name}
                    sm={12} // 1 card wide
                    md={6} // 2 card wide
                    lg={3} // 4 card wide
                  >
                    <SubscriptionCard
                      subscription={subscription}
                      choosePlanHandler={choosePlanHandler}
                    />
                  </Grid>
                ))}
            </Grid>
          </Container>
        </Container>
      </Box>
    </>
  );
});

export default PricingPlans;
