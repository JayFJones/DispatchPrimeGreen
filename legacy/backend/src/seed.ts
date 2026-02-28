import type { Application } from './declarations'
import { UserRole } from './services/users/users.schema'

export const seedAdminUser = async (app: Application): Promise<void> => {
  try {
    const usersService = app.service('users')

    // Check if admin user already exists
    const existingAdmin = await usersService.find({
      query: {
        email: 'admin@cromulent.net'
      }
    })

    if (existingAdmin.total === 0) {
      console.log('Creating default admin user...')

      // Create admin user
      await usersService.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@cromulent.net',
        password: 'Cromul3nt!',
        roles: [UserRole.ADMIN, UserRole.DASHBOARD]
      })

      console.log('✅ Default admin user created successfully')
      console.log('   Email: admin@cromulent.net')
      console.log('   Password: Cromul3nt!')
      console.log('   Roles: admin, dashboard')
    } else {
      console.log('🔍 Admin user already exists, skipping creation')
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
  }
}
