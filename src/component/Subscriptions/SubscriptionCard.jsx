import {
  Card as MaterialCard,
  Button as MaterialButton,
  Box,
  CardActions,
  CardContent,
  CardHeader,
  Divider,
  Icon,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { BsCheckCircleFill } from 'react-icons/bs';

const isChoosingDisabled = (subscription, userSubscriptionDetails) => {
  // If there's no userSubscriptionDetails, we can choose the plan
  if (!userSubscriptionDetails) {
    return false;
  }

  // Disable if it's the current plan, or what we're changing to it
  return (
    subscription.priceId === userSubscriptionDetails.subscription.priceId ||
    subscription.priceId === userSubscriptionDetails.subscriber.futurePriceId
  );
};

const calcButtonText = (subscription, userSubscriptionDetails) => {
  // If there's no userSubscriptionDetails, we're able to Purchase
  if (!userSubscriptionDetails) {
    return 'Purchase';
  }

  // If this is our current plan, say so
  if (subscription.priceId === userSubscriptionDetails.subscription.priceId) {
    return 'Current Plan';
  }

  if (
    subscription.priceId === userSubscriptionDetails.subscriber.futurePriceId
  ) {
    return 'Changing To';
  }

  // If this plan is the same or more, it's an 'upgrade'
  if (subscription.amount >= userSubscriptionDetails.subscription.amount) {
    return 'Upgrade';
  }

  // Failing all else, it's a 'downgrade'
  return 'Downgrade';
};

const buildButtonForChoosingPlan = (
  theme,
  subscription,
  userSubscriptionDetails,
  choosePlanHandler
) => {
  const disabled = isChoosingDisabled(subscription, userSubscriptionDetails);
  const buttonText = calcButtonText(subscription, userSubscriptionDetails);

  let sx = {
    fontWeight: 500,
    background: theme.palette.common.black,
    color: 'white',
    border: '1px solid transparent',
    ':hover': {
      background: theme.palette.common.black,
      border: '1px solid white',
    },
  };

  if (disabled) {
    sx.border = '1px solid var(--Disabled-Text, #999)';
    sx.background = 'var(--Gray, #e7e7e7)';
  }

  return (
    <MaterialButton
      disabled={disabled}
      onClick={() => choosePlanHandler(subscription.priceId)}
      sx={sx}
      fullWidth
    >
      {buttonText}
    </MaterialButton>
  );
};

export const SubscriptionCard = ({
  subscription,
  userSubscriptionDetails = null,
  choosePlanHandler,
}) => {
  const theme = useTheme();

  return (
    <MaterialCard
      sx={{
        padding: '12px',
        maxWidth: { sm: 380, xs: '100%' },
        width: '100%',
        borderRadius: '20px',
        boxShadow: 'none',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        margin: '0 auto',
        justifyContent: 'space-between',
        backgroundColor: '#F8F8F8',
      }}
    >
      <Box>
        <CardHeader
          title={subscription.name}
          titleTypographyProps={{
            align: 'center',
            fontSize: 40,
            color: '#FFF',
          }}
          sx={{
            backgroundColor: '#000',
            borderRadius: '16px',
            padding: '27px 0px',
          }}
        />
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              gap: 1,
              padding: '15px 0',
              height: 70,
            }}
          >
            <Typography
              component="h2"
              variant="h3"
              color="text.primary"
              fontSize={35}
              fontWeight={600}
              lineHeight="30px"
              marginLeft="4px"
            >
              {`$${subscription.amount}`}
            </Typography>
            <Stack>
              <Typography variant="body1" color="text.primary">
                /{subscription.interval}
              </Typography>
            </Stack>
          </Box>
          <Divider
            sx={{
              border: '1px solid #000',
              opacity: '10%',
              margin: '14px 0',
            }}
          />
          {subscription.features.map((feature) => (
            <Box
              key={feature.id}
              display="flex"
              alignItems="flex-start"
              mb={1}
              gap={2}
              sx={{
                display: 'flex',
              }}
            >
              <Icon sx={{ width: 20, height: 21 }}>
                <BsCheckCircleFill color="#7FC9C7" />
              </Icon>
              <Typography
                component="li"
                variant="body1"
                align="left"
                key={feature.label}
                sx={{
                  listStyle: 'none',
                  lineHeight: '22px',
                }}
              >
                {feature.label}
                <span className="fw-bold white-space-nowrap">
                  {' '}
                  {feature.label.slice(0, 18) === 'AI Video Generator'
                    ? 'beta access'
                    : ''}
                </span>
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Box>
      <CardActions>
        {buildButtonForChoosingPlan(
          theme,
          subscription,
          userSubscriptionDetails,
          choosePlanHandler
        )}
      </CardActions>
    </MaterialCard>
  );
};
