import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AuthLayout from "../components/layout/AuthLayout";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { TextLabelInput, PasswordInput } from "../components/ui/FormFields";
import { useState } from "react";

const LoginSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().required("Required"),
});

export default function LoginPage() {
  const { login, logout, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  if (user) {
    const dest = user.role === "client" ? "/dashboard" : "/admin";
    navigate(dest, { replace: true });
    return null;
  }

  return (
    <AuthLayout>
      <div className="text-center mb-5">
        <h1 className="text-xl md:text-2xl font-semibold text-primary">Welcome back</h1>
        <p className="text-gray-500 mt-1">Login to access your account</p>
      </div>

      <Formik
        initialValues={{ email: "", password: "" }}
        validationSchema={LoginSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setError("");
          try {
            const loggedInUser = await login(values.email, values.password);
            if (loggedInUser.role !== "client") {
              logout();
              setError(
                "This login is for clients only. Please use the staff portal.",
              );
              return;
            }
            navigate("/dashboard", { replace: true });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
                {error}
              </div>
            )}

            <TextLabelInput
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@company.com"
            />

            <PasswordInput
              label="Password"
              name="password"
              placeholder="Enter your password"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </Form>
        )}
      </Formik>

      <p className="mt-8 text-center text-sm text-gray-500">
        Staff or admin?{" "}
        <Link
          to="/admin/login"
          className="text-primary font-semibold hover:underline"
        >
          Log in here
        </Link>
      </p>
    </AuthLayout>
  );
}
