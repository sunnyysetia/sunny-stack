import { Link } from '@tanstack/react-router';

import SignIn from './sign-in';
import SignUp from './sign-up';

type AuthFormProps = { mode: 'login' } | { mode: 'signup' };

const AuthForm = ({ mode }: AuthFormProps) => {
  const isLogin = mode === 'login';

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-semibold text-zinc-900">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h2>

        <p className="text-sm text-zinc-500">
          {isLogin ? 'Enter your email to continue' : 'Enter your email to get started'}
        </p>
      </div>

      {/* Form + Footer */}
      <div className="flex flex-col gap-6">
        {isLogin ? <SignIn /> : <SignUp />}

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-sm text-zinc-500">Or</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <p className="text-center text-sm text-zinc-600">
          {isLogin ? 'Not using Sunny yet?' : 'Already have an account?'}{' '}
          <Link
            className="text-brand-primary inline font-medium hover:underline"
            to={isLogin ? '/sign-up' : '/sign-in'}
          >
            {isLogin ? 'Create an account' : 'Sign in'}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
