import {
  Entity,
  helper,
  LoadStrategy,
  ManyToOne,
  MikroORM,
  PostgreSqlDriver,
  PrimaryKey,
  ref,
  Ref
} from '@mikro-orm/postgresql';

import {Type} from '@mikro-orm/core'

export class IDStoredAsInteger extends Type<string, number> {
  convertToDatabaseValue(value: string): number {
    return parseInt(value)
  }

  convertToJSValue(value: number): string {
    return `${value}`
  }

  getColumnType() {
    return `integer`
  }

  // FIXES the issue
  // compareValues(a: number, b: number): boolean {
  //   return a.toString() === b.toString()
  // }

}


@Entity()
class AnalysisGroup {
  @PrimaryKey({type: IDStoredAsInteger, autoincrement: true})
  readonly id!: string;
}

@Entity()
class Analysis {
  @PrimaryKey({type: IDStoredAsInteger, autoincrement: true})
  readonly id!: string;

  @ManyToOne(() => AnalysisGroup, { fieldName: 'analysisGroupId', deleteRule: 'NO ACTION', hidden: true })
  public analysisGroup!: Ref<AnalysisGroup>
}

@Entity()
class Trajectory {
  @PrimaryKey({type: IDStoredAsInteger, autoincrement: true})
  readonly id!: string;

  @ManyToOne(() => Analysis, { deleteRule: 'CASCADE', fieldName: 'referenceAnalysisId', index: true })
  referenceAnalysis!: Ref<Analysis>
}


let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: 'test',
    host: 'localhost',
    port: 5453,
    user: "postgres_user",
    password: "postgres_password",
    entities: [Analysis, AnalysisGroup, Trajectory],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing,
    driver: PostgreSqlDriver,
    loadStrategy: LoadStrategy.SELECT_IN,
    serialization: {
      forceObject: true
    },
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test('basic CRUD example', async () => {
  const analysisGroup1 = orm.em.create(AnalysisGroup, {});
  const analysis = orm.em.create(Analysis, { analysisGroup: ref(analysisGroup1) });
  const trajectory = orm.em.create(Trajectory, { referenceAnalysis: ref(analysis) });

  await orm.em.flush();
  orm.em.clear();

  // KO; in this order, the update is triggered in my codebase, but this is not the case here
  const koFetchedTrajectory = await orm.em.findOneOrFail(Trajectory, { id: trajectory.id });
  const koFetchedAnalysis = await orm.em.findOneOrFail(Analysis, { id: analysis.id });
  console.log("fetchedAnalysis", helper(koFetchedAnalysis).__originalEntityData)
  await orm.em.flush();
  orm.em.clear();

  // OK: in this order, the update isn't triggered
  const okFetchedAnalysis = await orm.em.findOneOrFail(Analysis, { id: analysis.id });
  const okFetchedTrajectory = await orm.em.findOneOrFail(Trajectory, { id: trajectory.id });
  await orm.em.flush();
  orm.em.clear();

});
