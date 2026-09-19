import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#00796B", // Vibrant Teal (Updated for Continuous Deployment Demo - Task 9.3C)
    },
    secondary: {
      main: "#E65100", // Vibrant Deep Orange
    },
    background: {
      default: "#f5f5f5",
    },
  },

  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
  },

  shape: {
    borderRadius: 8,
  },
});

export default theme;