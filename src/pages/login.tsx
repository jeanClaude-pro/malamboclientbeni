/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  login as loginApi,
  register as registerApi,
} from "../services/authService";

import { Store, Mail, Lock, User, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";

type Mode = "login" | "register";

const LoginPage = () => {
  const [mode, setMode] = React.useState<Mode>("login");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        // Validate passwords match
        if (password !== confirmPassword) {
          throw new Error("Les mots de passe ne correspondent pas");
        }
        
        await registerApi({ username, email, password });
        toast.success("Compte créé. Un Super Admin doit maintenant attribuer votre rôle et votre agence.");
        setMode("login");
        // Clear form
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
      } else {
        const { user, token } = await loginApi({ email, password });
        setAuth({ token, user });
        toast.success("Connexion réussie !");
        navigate("/");
      }
    } catch (err: any) {
      const msg = err?.message || "Une erreur est survenue";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-black via-blue-950 to-black flex items-center justify-center p-3 sm:p-4 fixed inset-0 overflow-hidden">
      <div className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-2xl shadow-2xl overflow-hidden w-full max-w-md border border-blue-800/50 max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header with logo - Fixed at top */}
        <div className="p-6 sm:p-8 pb-4 sm:pb-6 flex-shrink-0">
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/50 border border-blue-400/30">
              <Store className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {mode === "login" ? "Bon retour" : "Créer un compte"}
            </h1>
            <p className="text-sm sm:text-base text-blue-200/70">
              {mode === "login"
                ? "Connectez-vous pour continuer"
                : "Rejoignez-nous pour commencer"}
            </p>
          </div>
        </div>

        {/* Scrollable Form Area */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 sm:pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {mode === "register" && (
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs sm:text-sm font-medium text-blue-200 mb-1"
                >
                  <User className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                  <input
                    id="username"
                    type="text"
                    placeholder="Entrez votre nom d'utilisateur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50 transition"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs sm:text-sm font-medium text-blue-200 mb-1"
              >
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="Entrez votre email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs sm:text-sm font-medium text-blue-200 mb-1"
              >
                <Lock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Entrez votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-11 py-2.5 sm:py-3 text-sm sm:text-base bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs sm:text-sm font-medium text-blue-200 mb-1"
                >
                  <Lock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmez votre mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-11 py-2.5 sm:py-3 text-sm sm:text-base bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    aria-label={showConfirmPassword ? "Masquer la confirmation" : "Afficher la confirmation"}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-900/50 border border-red-700/50 text-red-300 p-2.5 sm:p-3 rounded-lg text-xs sm:text-sm flex items-center gap-2">
                <div className="w-1 h-6 sm:h-8 bg-red-500 rounded-full"></div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-2.5 sm:py-3 px-4 rounded-lg text-sm sm:text-base font-medium hover:from-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition disabled:opacity-50 border border-blue-400/30 shadow-lg shadow-blue-900/50"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Traitement...
                </span>
              ) : mode === "login" ? (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                  Se connecter
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                  S'inscrire
                </span>
              )}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-blue-200/70">
              {mode === "login"
                ? "Vous n'avez pas de compte ? "
                : "Vous avez déjà un compte ? "}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                  // Clear form when switching modes
                  setUsername("");
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
                className="text-blue-400 font-medium hover:text-blue-300 focus:outline-none focus:underline transition border-b border-blue-400/30 hover:border-blue-300/50 text-xs sm:text-sm"
              >
                {mode === "login" ? "S'inscrire" : "Se connecter"}
              </button>
            </p>
          </div>
        </div>

        {/* Footer - Fixed at bottom for login mode */}
        {mode === "login" && (
          <div className="bg-black/30 p-3 sm:p-4 border-t border-blue-800/30 text-center flex-shrink-0">
            <p className="text-[10px] sm:text-xs text-blue-300/70">
              En continuant, vous acceptez nos Conditions d'utilisation
            </p>
          </div>
        )}
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          backgroundColor: '#1f2937',
          color: '#f3f4f6',
          border: '1px solid #1e3a8a',
        }}
      />
    </div>
  );
};

export default LoginPage;
