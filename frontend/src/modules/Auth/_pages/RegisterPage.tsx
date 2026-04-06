import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router';
import { Activity } from 'lucide-react';
import { Button, MainInput } from '@UI/index';
import { useAuth } from '@hooks/useAuth';
import { ERoutes } from '@constants/routes';
import { getErrorMessage } from '../../../app/utils/get-error-message';

const schema = z.object({
  first_name: z.string().min(1, 'Required').optional().or(z.literal('')),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormValues = z.infer<typeof schema>;

function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await registerUser({
        email: values.email,
        password: values.password,
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
      });
      navigate(ERoutes.DASHBOARD, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-accent-soft">
            <Activity className="h-5 w-5 text-accent" />
          </div>
          <span className="text-xl font-semibold tracking-tight">
            Trading<span className="text-accent">Term</span>
          </span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="mb-1 text-xl font-semibold">Create account</h1>
          <p className="mb-6 text-sm text-text-dim">
            Start tracking the markets in real time
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <MainInput
                label="First name"
                placeholder="Jane"
                error={errors.first_name?.message}
                {...register('first_name')}
              />
              <MainInput
                label="Last name"
                placeholder="Doe"
                error={errors.last_name?.message}
                {...register('last_name')}
              />
            </div>
            <MainInput
              label="Email"
              type="email"
              placeholder="trader@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <MainInput
              label="Password"
              type="password"
              placeholder="At least 6 characters"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />

            {serverError && (
              <div className="rounded border border-down/40 bg-down/10 px-3 py-2 text-xs text-down">
                {serverError}
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="mt-2">
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-dim">
            Already have an account?{' '}
            <Link to={ERoutes.LOGIN} className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
