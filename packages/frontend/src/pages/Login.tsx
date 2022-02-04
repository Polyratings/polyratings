import { useState } from 'react';
import loginBackground from '@/assets/home-header.webp';
import { useService, useProtectedRoute } from '@/hooks';
import { AuthService } from '@/services';

export function Login() {
  const [calPolyUsername, setCalPolyUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const authService = useService(AuthService);

  const logUserIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await authService.login(calPolyUsername, password);
    } catch (e) {
      setErrorText(e as string);
    }
  };

  // Redirect to homepage if in authenticated state
  useProtectedRoute(false, '/', (user) => `Welcome ${user.username}`);

  return (
    <div
      className="h-screenWoNav flex justify-center items-center"
      style={{
        backgroundImage: `url(${loginBackground})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="p-5 transform md:-translate-y-1/4" style={{ width: '500px' }}>
        <div className="bg-white shadow-lg rounded p-10">
          <h2 className="text-3xl font-bold mb-6">Sign In</h2>
          <form onSubmit={(e) => logUserIn(e)}>
            <h3 className="font-semibold">Username</h3>
            <div className="h-10 mb-8 flex">
              <input
                type="text"
                placeholder="Username"
                className="border-gray-300 border w-full rounded-l h-full pl-2"
                value={calPolyUsername}
                onChange={(e) => setCalPolyUsername(e.target.value)}
              />
            </div>
            <h3 className="font-semibold">Password</h3>
            <div className="mb-8">
              <input
                type="password"
                placeholder="Password"
                className="h-10 border-gray-300 border w-full rounded pl-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-red-600">{errorText}</p>
            </div>
            <button className="w-full h-11 rounded bg-cal-poly-green text-white" type="submit">
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
