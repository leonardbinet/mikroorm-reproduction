import { MikroORM } from '@mikro-orm/postgresql';
import {Entity, PrimaryKey, Property} from "@mikro-orm/core";

@Entity()
class User {

  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @Property({ type: 'jsonb'})
  meta: { age: number; sex: string };

  constructor(name: string, meta: { age: number; sex: string }) {
    this.name = name;
    this.meta = meta;
  }

}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: 'test',
    host: 'localhost',
    port: 5453,
    user: "postgres_user",
    password: "postgres_password",
    entities: [User],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test('basic CRUD example', async () => {
  orm.em.create(User, { name: 'Foo', meta: { age: 21, sex: "M"} });
  await orm.em.flush();
  orm.em.clear();

  const user = await orm.em.findOneOrFail(User, { meta: {$in: [{age: 21, sex: "M"}]} });
  expect(user.name).toBe('Foo');
});
