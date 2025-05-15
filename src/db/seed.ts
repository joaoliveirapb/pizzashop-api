import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import { db } from './connection'
import {
  authLinks,
  orderItems,
  orders,
  products,
  restaurants,
  users,
} from './schema'

// Reset database
await db.delete(users)
await db.delete(restaurants)
await db.delete(orderItems)
await db.delete(orders)
await db.delete(products)
await db.delete(authLinks)

console.log('Database reset!')

// Create customers
const [customer1, customer2] = await db
  .insert(users)
  .values([
    {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: 'customer',
    },
    {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: 'customer',
    },
  ])
  .returning()

console.log('Created customers!')

// Create manager
const [manager] = await db
  .insert(users)
  .values([
    {
      name: faker.person.fullName(),
      email: 'admin@admin.com',
      role: 'manager',
    },
  ])
  .returning({ id: users.id })

console.log('Created manager!')

// Create restaurant
const [restaurant] = await db
  .insert(restaurants)
  .values([
    {
      name: faker.company.name(),
      description: faker.lorem.paragraph(),
      managerId: manager?.id,
    },
  ])
  .returning()

if (!restaurant || !restaurant.id) {
  throw new Error('Failed to create restaurant')
}

console.log('Created restaurant!')

// Create products
function generateProduct(restaurantId: string) {
  return {
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    priceInCents: Number(faker.commerce.price({ min: 190, max: 490, dec: 0 })),
    restaurantId,
  }
}

const availableProducts = await db
  .insert(products)
  .values([
    generateProduct(restaurant.id),
    generateProduct(restaurant.id),
    generateProduct(restaurant.id),
    generateProduct(restaurant.id),
    generateProduct(restaurant.id),
  ])
  .returning()

console.log('Created products!')

// Create orders
type OrderItemsInsert = typeof orderItems.$inferInsert
type OrderInsert = typeof orders.$inferInsert

const orderItemsToInsert: OrderItemsInsert[] = []
const ordersToInsert: OrderInsert[] = []

for (let i = 0; i < 200; i++) {
  const orderId = createId()

  const orderProducts = faker.helpers.arrayElements(availableProducts, {
    min: 1,
    max: 3,
  })

  let totalInCents = 0

  for (const orderProduct of orderProducts) {
    const quantity = faker.number.int({ min: 1, max: 3 })

    totalInCents += orderProduct.priceInCents * quantity

    orderItemsToInsert.push({
      orderId,
      productId: orderProduct.id,
      priceInCents: orderProduct.priceInCents,
      quantity,
    })
  }

  ordersToInsert.push({
    id: orderId,
    customerId: faker.helpers.arrayElement([customer1?.id, customer2?.id]),
    restaurantId: restaurant.id,
    totalInCents,
    status: faker.helpers.arrayElement([
      'pending',
      'processing',
      'delivering',
      'delivered',
      'canceled',
    ]),
    createdAt: faker.date.recent({ days: 40 }),
  })
}

await db.insert(orders).values(ordersToInsert)
await db.insert(orderItems).values(orderItemsToInsert)

console.log('Created orders!')

console.log('Database seeded successfully!')

process.exit()
