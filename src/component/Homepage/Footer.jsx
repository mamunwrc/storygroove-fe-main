import {
  Container,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";


const Footer = () => {
  return (
    <Container
      maxWidth="lg"
      sx={{
        display: "flex",
        justifyContent: "space-between",
        padding: "26px 0 26px",
        paddingLeft: "0px !important",
        paddingRight: "0px !important",
        alignItems: "center",
        flexDirection: { sm: "row", xs: "column" },
      }}
    >
      <Stack
        sx={{
          justifyContent: "space-between",
          marginLeft: 1,
          alignItems: "center",
        }}
        direction="row"
      >
        <IconButton sx={{ width: "fit-content" }} href="/">
          <Typography
            sx={{
              fontSize: { sm: 18 },
              color: "#656565",
              fontWeight: 700,
              fontFamily: "Montserrat, sans-serif",
              whiteSpace: "nowrap",
              letterSpacing: "3px",
            }}
          >
            {" "}
            StoryGroove AI
          </Typography>
        </IconButton>
        <Typography
          variant="body1"
          color="text.primary"
          sx={{
            opacity: "50%",
            paddingLeft: "8px",
            display: { sm: "block", xs: "none" },
          }}
        >
          Copyright © 2025 StoryGroove AI <br className="d-md-none" /> All rights
          reserved
        </Typography>
      </Stack>

      <Stack
        direction="row"
        alignItems={{ md: "flex-start", xs: "center" }}
        gap={{ md: 8, xs: 3 }}
        flexDirection={{ sm: "row", xs: "column" }}
        justifyContent={{ md: "right", xs: "center" }}
        marginRight={{ sm: "12px", xs: 0 }}
        marginTop={{ sm: 0, xs: 2 }}
      >

        <List
          sx={{
            display: "flex",
            flexDirection: { sm: "row", xs: "column" },
            alignItems: "center",
            gap: { lg: 10, md: 5, sm: 2, xs: 1 },
          }}
          disablePadding={true}
        >
          <ListItem
            disablePadding={true}
            sx={{
              textAlign: { sm: "right", xs: "center" },
              justifyContent: "center",
            }}
          >
            <a href="/privacy-policy" className="text-decoration-none">
              <ListItemText
                primary="Privacy Policy"
                sx={{
                  whiteSpace: "nowrap",
                  color: "#1b1b1b",

                  ".MuiTypography-root": {
                    fontWeight: 500,
                  },
                }}
              />
            </a>
          </ListItem>
          <ListItem
            disablePadding={true}
            sx={{ textAlign: { sm: "right", xs: "center" } }}
          >
            <a href="/terms-and-condition" className="text-decoration-none">
              <ListItemText
                primary="Terms and Conditions "
                sx={{
                  whiteSpace: "nowrap",
                  color: "#1b1b1b",
                  ".MuiTypography-root": {
                    fontWeight: 500,
                  },
                }}
              />
            </a>
          </ListItem>
          <ListItem
            sx={{
              textAlign: { sm: "right", xs: "center" },
              justifyContent: "center",
            }}
            disablePadding={true}
          >
            <a
              href="mailto"
              className="text-decoration-none fw-bold"
            >
              <ListItemText
                primary="Contact Us"
                sx={{
                  whiteSpace: "nowrap",
                  color: "#1b1b1b",
                  ".MuiTypography-root": {
                    fontWeight: 500,
                  },
                }}
              />
            </a>
          </ListItem>
        </List>
      </Stack>
      <Typography
        variant="body1"
        color="text.primary"
        sx={{
          opacity: "50%",
          paddingLeft: "8px",
          display: { sm: "none", xs: "block" },
          textAlign: { sm: "right", xs: "center" },
          fontSize: { sm: 16, xs: 14 },
          marginTop: { sm: 0, xs: 2 },
        }}
      >
        Copyright © 2025 StoryGroove AI <br className="d-md-none" /> All rights
        reserved
      </Typography>
    </Container>
  );
};

export default Footer;
