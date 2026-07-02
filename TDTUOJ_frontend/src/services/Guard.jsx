import { useLocation, Navigate } from "react-router-dom";
import ApiService from "./ApiService";

export const ParticipantRoute = ({ element }) => {
  const location = useLocation();
  return ApiService.isAuthenticated() ? (
    element
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
};

export const AdminRoute = ({ element }) => {
  const location = useLocation();
  return ApiService.isAdmin() ? (
    element
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
};

export const CreatorRoute = ({ element }) => {
  const location = useLocation();
  return ApiService.isCreator() ? (
    element
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
};

export const AdminOrCreatorRoute = ({ element }) => {
  const location = useLocation();
  return ApiService.isAdmin() || ApiService.isCreator() ? (
    element
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
};
