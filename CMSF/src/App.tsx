import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./app/theme/ThemeContext";
import { AuthProvider } from "./features/auth/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { router } from "./app/router";

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;


