import 'axios';

declare module 'axios' {
  // Allow tagging a request as retried so we do not loop forever on 401s
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}
