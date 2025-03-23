import { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/utils/firestore-collections';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Shield, ShieldOff, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarFallback } from '@/lib/utils';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: 'user' | 'admin';
  createdAt?: string;
  updatedAt?: string;
}

function maskEmail(email: string): string {
  if (!email || email === 'No email provided') return email;
  
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  
  const [username, domain] = parts;
  
  // For very short usernames, just show first character
  if (username.length <= 3) {
    return `${username.charAt(0)}****@${domain}`;
  }
  
  // For longer usernames, show first 2 and last character
  const maskedUsername = username.length > 5 
    ? `${username.slice(0, 2)}${'*'.repeat(username.length - 3)}${username.slice(-1)}`
    : `${username.slice(0, 1)}${'*'.repeat(username.length - 2)}${username.slice(-1)}`;
  
  return `${maskedUsername}@${domain}`;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersCollection = collection(db, COLLECTIONS.USERS);
      const usersSnapshot = await getDocs(usersCollection);
      const usersData = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          ...data,
          email: data.email || 'No email provided'
        } as User;
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserRole = async (user: User) => {
    if (!user.uid) return;

    try {
      setUpdatingUser(user.uid);
      const userRef = doc(db, COLLECTIONS.USERS, user.uid);
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setUsers(users.map(u => 
        u.uid === user.uid ? { ...u, role: newRole } : u
      ));

      toast({
        title: 'Success',
        description: `User ${maskEmail(user.email)} is now a ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          Manage user roles and permissions. Admins can view predictions and update match results.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                      <span className="ml-2">Loading users...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback>
                            {getAvatarFallback(user.displayName || user.email || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.displayName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[250px]">
                      <span className="text-sm text-gray-600">{maskEmail(user.email)}</span>
                      <span className="hidden">{user.email}</span>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        {user.role || 'user'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserRole(user)}
                        disabled={updatingUser === user.uid}
                      >
                        {updatingUser === user.uid ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : user.role === 'admin' ? (
                          <ShieldOff className="h-4 w-4" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                        <span className="ml-2">
                          {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 