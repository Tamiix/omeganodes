import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  email: string;
  discord_id: string | null;
  discord_username: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  granted_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isAdmin: boolean;
  isModerator: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithDiscord: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);
      
      if (rolesData) {
        setRoles(rolesData as UserRole[]);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Function to update Discord info from OAuth provider
    const updateDiscordInfo = async (user: User) => {
      const provider = user.app_metadata?.provider;
      const identities = user.identities;
      
      if (provider === 'discord' && identities) {
        const discordIdentity = identities.find(i => i.provider === 'discord');
        if (discordIdentity?.identity_data) {
          const discordId = discordIdentity.identity_data.provider_id || discordIdentity.id;
          const discordUsername = discordIdentity.identity_data.full_name || 
                                   discordIdentity.identity_data.name ||
                                   discordIdentity.identity_data.custom_claims?.global_name;
          
          // Update profile with Discord info - use type assertion since types may be out of sync
          await supabase
            .from('profiles')
            .update({ 
              discord_id: discordId,
              discord_username: discordUsername
            } as any)
            .eq('user_id', user.id);
        }
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer fetching user data to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            // Update Discord info if signing in with Discord
            if (event === 'SIGNED_IN') {
              updateDiscordInfo(session.user);
            }
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username
        }
      }
    });
    
    // If signup was successful, send Discord notification
    if (!error) {
      try {
        await supabase.functions.invoke('discord-registration-notification', {
          body: {
            email: email,
            registerDate: new Date().toISOString()
          }
        });
      } catch (notificationError) {
        console.error('Failed to send registration notification:', notificationError);
      }
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error: error as Error | null };
  };

  const signInWithDiscord = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: 'identify'
      }
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const isAdmin = roles.some(r => r.role === 'admin');
  const isModerator = roles.some(r => r.role === 'moderator' || r.role === 'admin');

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      isAdmin,
      isModerator,
      isLoading,
      signUp,
      signIn,
      signInWithDiscord,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
