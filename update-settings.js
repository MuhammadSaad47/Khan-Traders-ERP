const fs = require('fs')

let code = fs.readFileSync('src/renderer/src/pages/settings/SettingsPage.tsx', 'utf8')

// 1. Hook updates
code = code.replace('useDisableUser', 'useDeleteUser')
code = code.replace('disableUser = useDisableUser()', 'deleteUser = useDeleteUser()')
code = code.replace(/setUserToDisable/g, 'setUserToDelete')
code = code.replace(/userToDisable/g, 'userToDelete')
code = code.replace('disableUser.mutate', 'deleteUser.mutate')
code = code.replace('User disabled successfully', 'User deleted successfully')
code = code.replace('title="Disable User"', 'title="Delete User"')
code = code.replace('confirmText="Disable User"', 'confirmText="Delete User"')
code = code.replace('Are you sure you want to disable', 'Are you sure you want to delete')
code = code.replace('>Disable<', '>Delete<')

// 2. Tabs logic
code = code.replace('defaultValue="general"', 'defaultValue={isManager ? "general" : "users"}')
code = code.replace(/<TabsList className="mt-4">[\s\S]*?<\/TabsList>/, `<TabsList className="mt-4">
            {isManager && <TabsTrigger value="general">General</TabsTrigger>}
            <TabsTrigger value="users">{isManager ? 'User Management' : 'My Account'}</TabsTrigger>
          </TabsList>`)

// 3. Move Change Password to "users" tab and wrap General tab in isManager
code = code.replace(/<TabsContent value="general"[\s\S]*?<\/TabsContent>/, `$&`)

// Wait, I need to wrap General tab with {isManager && ...}
code = code.replace(/<TabsContent value="general" className="flex-1 min-h-0 mt-0 data-\[state=active\]:flex flex-col">/, `{isManager && (
      <TabsContent value="general" className="flex-1 min-h-0 mt-0 data-[state=active]:flex flex-col">`)

// Close the wrapper
code = code.replace(/<\/Card>\s*<\/div>\s*<\/TabsContent>/, `</Card>
      </div>
    </TabsContent>
    )}`)

// 4. Extract profile tab content
const profileTabRegex = /<TabsContent value="profile"[\s\S]*?<\/TabsContent>/;
const profileMatch = code.match(profileTabRegex);
const changePassCard = profileMatch[0].replace(/<TabsContent value="profile" className="[^"]*">/, '').replace(/<\/TabsContent>$/, '').trim()

// Remove old profile tab
code = code.replace(profileTabRegex, '')

// 5. Update users tab
const usersTabRegex = /\{isManager && \(\s*<TabsContent value="users"[\s\S]*?<\/TabsContent>\s*\)\}/;
let usersTabCode = code.match(usersTabRegex)[0]

// Unwrap from {isManager && ()}
usersTabCode = usersTabCode.replace(/\{isManager && \(\s*(<TabsContent value="users"[\s\S]*?<\/TabsContent>)\s*\)\}/, '$1')

// Inject Change Password card at the top, and wrap the manage users card in {isManager && }
usersTabCode = usersTabCode.replace(/<Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col h-full">/, 
`<div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
          <div className="w-full lg:w-1/3 flex flex-col h-full">
            ${changePassCard}
          </div>
          {isManager && (
            <div className="w-full lg:w-2/3 flex flex-col h-full">
              <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col h-full">`)

usersTabCode = usersTabCode.replace(/<\/TabsContent>/, `            </div>\n          )}\n        </div>\n      </TabsContent>`)

// Replace the users tab in the main code
code = code.replace(usersTabRegex, usersTabCode)


fs.writeFileSync('src/renderer/src/pages/settings/SettingsPage.tsx', code)
