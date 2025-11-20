import { MessageSquare, Code, Image, Video, Users, Plus, Moon, Sun, LogOut } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { title: 'AI Chat', url: '/', icon: MessageSquare },
  { title: 'Code Editor', url: '/code', icon: Code },
  { title: 'Image Generator', url: '/image', icon: Image },
  { title: 'Video Generator', url: '/video', icon: Video },
  { title: 'Collaborate', url: '/collaborate', icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar className={collapsed ? 'w-16' : 'w-64'} collapsible="icon">
      <SidebarContent className="custom-scrollbar">
        <div className="p-4">
          {!collapsed && (
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-bold text-lg gradient-text">CodeSphere AI</h2>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
            </div>
          )}
        </div>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className={collapsed ? '' : 'mr-2'} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-4" />

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Actions</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-sidebar-accent"
                  size={collapsed ? 'icon' : 'default'}
                >
                  <Plus className={collapsed ? '' : 'mr-2'} />
                  {!collapsed && 'New Chat'}
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="space-y-2 p-2">
          {user && !collapsed && (
            <div className="mb-2">
              <NotificationBell />
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            onClick={toggleTheme}
            className="w-full justify-start"
          >
            {theme === 'dark' ? (
              <>
                <Sun className={collapsed ? '' : 'mr-2'} />
                {!collapsed && 'Light Mode'}
              </>
            ) : (
              <>
                <Moon className={collapsed ? '' : 'mr-2'} />
                {!collapsed && 'Dark Mode'}
              </>
            )}
          </Button>
          
          {user && (
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              onClick={signOut}
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className={collapsed ? '' : 'mr-2'} />
              {!collapsed && 'Sign Out'}
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
