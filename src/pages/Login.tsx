import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building, Lock, User, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authType, setAuthType] = useState<'local' | 'domain'>('local');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    const success = await login(username, password, authType);
    
    if (success) {
      toast({
        title: "Login Successful",
        description: "Welcome to the Employee Dashboard",
      });
      navigate('/dashboard');
    } else {
      setError('Invalid username or password');
      toast({
        title: "Login Failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <img src="/mti-logo.png" alt="MTI Logo" className="w-100 h-180" style={{ objectFit: 'contain' }}/>
          <div>
            <CardTitle className="text-2xl font-bold">MTI Employee Dashboard</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to access your workspace
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="authType">Authentication Type</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={authType === 'local' ? 'default' : 'outline'}
                  onClick={() => setAuthType('local')}
                  className="flex-1"
                  disabled={isLoading}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Local Account
                </Button>
                <Button
                  type="button"
                  variant={authType === 'domain' ? 'default' : 'outline'}
                  onClick={() => setAuthType('domain')}
                  className="flex-1"
                  disabled={isLoading}
                >
                  <Building className="w-4 h-4 mr-2" />
                  Domain Account
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">
                {authType === 'domain' ? 'Domain Username' : 'Username'}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder={authType === 'domain' ? 'Enter your domain username' : 'Enter your username'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              {authType === 'domain' && (
                <p className="text-sm text-muted-foreground">
                  Use your Active Directory username (without domain)
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;