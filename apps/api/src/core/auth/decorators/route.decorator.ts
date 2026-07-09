import { SetMetadata } from '@nestjs/common';

// Per-route access level, read by AuthGuard. Every controller/handler must
// declare exactly one — a route with none is denied by default (fail-closed).
//
//   @PublicRoute()  — no auth (health, webhooks, public pages)
//   @UserRoute()    — a valid better-auth user session
//   @ServiceRoute() — a valid internal service key (x-service-api-key)

export const IS_PUBLIC_ROUTE_KEY = 'isPublicRoute';
export const PublicRoute = () => SetMetadata(IS_PUBLIC_ROUTE_KEY, true);

export const IS_USER_ROUTE_KEY = 'isUserRoute';
export const UserRoute = () => SetMetadata(IS_USER_ROUTE_KEY, true);

export const IS_SERVICE_ROUTE_KEY = 'isServiceRoute';
export const ServiceRoute = () => SetMetadata(IS_SERVICE_ROUTE_KEY, true);
