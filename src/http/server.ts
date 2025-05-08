import { Elysia, t } from 'elysia'
import { db } from '../db/connection'
import { restaurants, users } from '../db/schema'

const app = new Elysia().post(
  '/restaurants',
  async ({ body, set }) => {
    const { restaurantName, managerName, managerEmail, managerPhone } = body

    const [manager] = await db
      .insert(users)
      .values({
        name: managerName,
        email: managerEmail,
        phone: managerPhone,
        role: 'manager',
      })
      .returning({ id: users.id })

    await db.insert(restaurants).values({
      name: restaurantName,
      managerId: manager?.id,
    })

    set.status = 204
  },
  {
    body: t.Object({
      restaurantName: t.String(),
      managerName: t.String(),
      managerEmail: t.String({ format: 'email' }),
      managerPhone: t.String(),
    }),
  }
)

app.listen(3333, () => {
  console.log('HTTP server running!')
})
