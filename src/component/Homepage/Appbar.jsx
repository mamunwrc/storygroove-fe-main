import * as React from 'react';
import PropTypes from 'prop-types';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Avatar, useTheme } from '@mui/material';
import { AiOutlineMenu } from 'react-icons/ai';
import { Link, useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../../service';

const Appbar = (props) => {
  const navigate = useNavigate();
  const { window } = props;
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // local variables
  const isUserLoggedIn = isLoggedIn();

  const handleDrawerToggle = () => {
    setMobileOpen((prevState) => !prevState);
  };

  const drawerWidth = 240;
  const navItems = ['Home', 'Pricing'];

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography
        sx={{
          fontSize: { sm: 18 },
          color: '#656565',
          fontWeight: 700,
          fontFamily: 'Montserrat, sans-serif',
          whiteSpace: 'nowrap',
          padding: '15px 0',
          letterSpacing: { sm: '3px', xs: '2px' },
        }}
      >
        {' '}
        StoryGroove AI
      </Typography>
      <Divider />
      <List>
        <Link className="text-decoration-none" to="/dashboard">
          <ListItem disablePadding>
            <ListItemButton sx={{ textAlign: 'center' }}>
              <ListItemText primary={'Home'} />
            </ListItemButton>
          </ListItem>
        </Link>
        <ListItem disablePadding onClick={props.targetHandler}>
          <ListItemButton sx={{ textAlign: 'center' }}>
            <ListItemText primary={'Pricing'} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  const container =
    window !== undefined ? () => window().document.body : undefined;
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '65px ',
      }}
    >
      <CssBaseline />
      <AppBar
        sx={{
          height: '65px',
          background: theme.palette.common.white,
          position: 'relative',
          boxShadow: 'none',
        }}
      >
        <Toolbar
          sx={{
            height: '65px',
            justifyContent: 'space-between',
            maxWidth: '1320px',
            margin: '0 auto',
            width: '100%',
            gap: '6px',
          }}
        >
          <IconButton
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              pr: 2,
              pl: 2,
              display: { sm: 'none' },
              borderRadius: '10px',
            }}
          >
            {/* <MenuIcon /> */}

            <AiOutlineMenu
              style={{
                fontSize: '26px',

                color: theme.palette.common.black,
              }}
            />
          </IconButton>
          <IconButton sx={{ width: 'fit-content' }} href="/">
            <Typography
              sx={{
                fontSize: { sm: 18, xs: 14 },
                color: '#656565',
                fontWeight: 700,
                fontFamily: 'Montserrat, sans-serif',
                whiteSpace: 'nowrap',
                letterSpacing: { sm: '3px', xs: '1px' },
              }}
            >
              {' '}
              StoryGroove AI
            </Typography>
          </IconButton>

          <Box
            sx={{
              display: {
                xs: 'none',
                sm: 'flex',
                alignItems: 'center',
                gap: 30,
              },
            }}
          >
            <Link to="/dashboard">
              <IconButton
                variant="caption"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.common.black,
                  textTransform: 'capitalize',
                  borderRadius: '5px',
                  fontSize: 18,
                }}
              >
                Home
              </IconButton>
            </Link>
            <IconButton
              variant="caption"
              sx={{
                fontWeight: 500,
                color: theme.palette.common.black,
                textTransform: 'capitalize',
                borderRadius: '5px',
                fontSize: 18,
              }}
              onClick={props.targetHandler}
            >
              Pricing
            </IconButton>
          </Box>
          {isUserLoggedIn ? (
            <>
              <Link to="/dashboard">
                <Button
                  size="medium"
                  variant="contained"
                  sx={{
                    background: theme.palette.common.black,
                    color: '#FFF',
                    textDecoration: 'none',
                    fontSize: { sm: 18, xs: 14 },
                  }}
                >
                  Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button
                  size="medium"
                  variant="contained"
                  sx={{
                    background: theme.palette.common.black,
                    color: '#FFF',
                    textDecoration: 'none !important',
                  }}
                >
                  {' '}
                  Sign In{' '}
                </Button>
              </Link>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Box>
        <Drawer
          container={container}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
    </Box>
  );
};

export default Appbar;
