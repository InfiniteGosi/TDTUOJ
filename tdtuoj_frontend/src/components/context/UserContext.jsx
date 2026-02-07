import { createContext, useContext, useState, useEffect } from "react";
import ApiService from "../../services/ApiService";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserProfile = async () => {
    if (ApiService.isAuthenticated()) {
      try {
        setIsLoading(true);
        const response = await ApiService.getOwnProfile();
        if (response.statusCode === 200) {
          setUserProfile(response.data);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setUserProfile(null);
    }
  };

  const refreshUserProfile = () => {
    return fetchUserProfile();
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  return (
    <UserContext.Provider
      value={{ userProfile, isLoading, refreshUserProfile }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};
