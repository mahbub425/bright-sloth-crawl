import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/auth";
import { useToast } from "@/components/ui/use-toast";
import { UserProfile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Upload, Edit, Trash2, Ban, CheckCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import UserFormDialog from "./UserFormDialog";
import BulkUploadDialog from "./BulkUploadDialog";

const usersPerPageOptions = [10, 20, 50, 100];

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(usersPerPageOptions[0]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    const offset = (currentPage - 1) * usersPerPage;
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,pin.ilike.%${searchQuery}%,department.ilike.%${searchQuery}%,designation.ilike.%${searchQuery}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + usersPerPage - 1);

    if (error) {
      toast({
        title: "Error fetching users",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUsers(data || []);
      setTotalUsersCount(count || 0);
    }
  }, [searchQuery, currentPage, usersPerPage, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page on new search
    fetchUsers();
  };

  const handleAddUserSuccess = () => {
    setIsAddUserDialogOpen(false);
    fetchUsers();
    toast({ title: "User Added", description: "New user has been successfully added." });
  };

  const handleEditUserSuccess = () => {
    setIsEditUserDialogOpen(false);
    setEditingUser(null);
    fetchUsers();
    toast({ title: "User Updated", description: "User profile has been successfully updated." });
  };

  const handleBulkUploadSuccess = () => {
    setIsBulkUploadDialogOpen(false);
    fetchUsers();
    toast({ title: "Bulk Upload Complete", description: "Bulk user upload process finished. Check logs for details." });
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Delete from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Optionally, delete from auth.users if you want to completely remove the user from Supabase Auth
      // Be careful with this, as it's irreversible.
      // const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      // if (authError) throw authError;

      toast({ title: "User Deleted", description: "User has been successfully deleted." });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Deletion Error",
        description: error.message || "An unexpected error occurred during user deletion.",
        variant: "destructive",
      });
    }
  };

  const handleToggleUserStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "User Status Updated",
        description: `User ${user.name} has been ${newStatus}.`,
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Status Update Error",
        description: error.message || "An unexpected error occurred while updating user status.",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(totalUsersCount / usersPerPage);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>

      {/* Search and Action Buttons */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex-1 flex items-center space-x-2 min-w-[250px]">
          <Input
            placeholder="Search by name, PIN, department, designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" /> Search
          </Button>
        </div>
        <Button onClick={() => setIsAddUserDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add New User
        </Button>
        <Button variant="outline" onClick={() => setIsBulkUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" /> Upload Bulk User
        </Button>
      </div>

      {/* User List Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">User List</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.pin}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{user.department || "N/A"}</TableCell>
                    <TableCell>{user.designation || "N/A"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingUser(user); setIsEditUserDialogOpen(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the user.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant={user.status === 'active' ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleToggleUserStatus(user)}
                      >
                        {user.status === 'active' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Rows per page:</span>
            <Select value={String(usersPerPage)} onValueChange={(value) => { setUsersPerPage(Number(value)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder={usersPerPage} />
              </SelectTrigger>
              <SelectContent>
                {usersPerPageOptions.map(option => (
                  <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={currentPage === page}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {/* Add/Edit User Dialog */}
      {isAddUserDialogOpen && (
        <UserFormDialog
          open={isAddUserDialogOpen}
          onOpenChange={setIsAddUserDialogOpen}
          onSaveSuccess={handleAddUserSuccess}
        />
      )}
      {isEditUserDialogOpen && editingUser && (
        <UserFormDialog
          open={isEditUserDialogOpen}
          onOpenChange={setIsEditUserDialogOpen}
          user={editingUser}
          onSaveSuccess={handleEditUserSuccess}
        />
      )}

      {/* Bulk Upload Dialog */}
      {isBulkUploadDialogOpen && (
        <BulkUploadDialog
          open={isBulkUploadDialogOpen}
          onOpenChange={setIsBulkUploadDialogOpen}
          onUploadSuccess={handleBulkUploadSuccess}
        />
      )}
    </div>
  );
};

export default UserManagement;