import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { ThemeProvider } from "./app/theme/ThemeContext";
import { router } from "./app/router";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
