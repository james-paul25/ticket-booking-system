import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { RequireAuth, RequireAdmin } from "@/components/common/RouteGuards";

import { LandingPage } from "@/pages/public/LandingPage";
import { LoginPage } from "@/pages/public/LoginPage";
import { RegisterPage } from "@/pages/public/RegisterPage";
import { NotFoundPage } from "@/pages/public/NotFoundPage";

import { SchedulesPage } from "@/pages/customer/SchedulesPage";
import { ScheduleDetailPage } from "@/pages/customer/ScheduleDetailPage";
import { BookingPage } from "@/pages/customer/BookingPage";
import { ConfirmationPage } from "@/pages/customer/ConfirmationPage";
import { BookingsHistoryPage } from "@/pages/customer/BookingsHistoryPage";
import { BookingDetailPage } from "@/pages/customer/BookingDetailPage";
import { ProfilePage } from "@/pages/customer/ProfilePage";

import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminSchedulesPage } from "@/pages/admin/AdminSchedulesPage";
import { AdminScheduleCreatePage } from "@/pages/admin/AdminScheduleCreatePage";
import { AdminBookingsPage } from "@/pages/admin/AdminBookingsPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminPaymentsPage } from "@/pages/admin/AdminPaymentsPage";
import { AdminQueuePage } from "@/pages/admin/AdminQueuePage";
import { AdminProcessingLogsPage } from "@/pages/admin/AdminProcessingLogsPage";
import { SequentialDemoPage } from "@/pages/admin/SequentialDemoPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },

      { path: "schedules", element: <SchedulesPage /> },
      { path: "schedules/:id", element: <ScheduleDetailPage /> },

      {
        path: "booking/:id",
        element: (
          <RequireAuth>
            <BookingPage />
          </RequireAuth>
        ),
      },
      {
        path: "booking-queue/:id",
        element: (
          <RequireAuth>
            <BookingPage />
          </RequireAuth>
        ),
      },
      {
        path: "booking/:id/confirmation",
        element: (
          <RequireAuth>
            <ConfirmationPage />
          </RequireAuth>
        ),
      },
      {
        path: "bookings",
        element: (
          <RequireAuth>
            <BookingsHistoryPage />
          </RequireAuth>
        ),
      },
      {
        path: "bookings/:id",
        element: (
          <RequireAuth>
            <BookingDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: "profile",
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },

      {
        path: "admin",
        element: (
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        ),
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "schedules", element: <AdminSchedulesPage /> },
          { path: "schedules/create", element: <AdminScheduleCreatePage /> },
          { path: "bookings", element: <AdminBookingsPage /> },
          { path: "users", element: <AdminUsersPage /> },
          { path: "payments", element: <AdminPaymentsPage /> },
          { path: "queue", element: <AdminQueuePage /> },
          { path: "processing-logs", element: <AdminProcessingLogsPage /> },
          { path: "sequential-demo", element: <SequentialDemoPage /> },
        ],
      },

      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
