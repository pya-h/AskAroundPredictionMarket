import { TokenTypeEnum } from '../../wallet/entities/token.entity';
import { QueryRunner } from 'typeorm';
import { UserConstants } from '../constants/constants';
import { NotFoundException } from '@nestjs/common';

export const getTokenIds = async (queryRunner: QueryRunner) => {
  const tokens = {};
  for (const tokenType of Object.values(TokenTypeEnum)) {
    const result = await queryRunner.query(
      'SELECT id FROM public."token" WHERE type=$1 LIMIT 1;',
      [tokenType],
    );
    if (result?.length) tokens[tokenType] = +result[0].id;
  }
  return tokens;
};

export const dropForeignKeys = async (
  queryRunner: QueryRunner,
  tableName: string,
  relatedColumnNames: string[],
) => {
  const table = await queryRunner.getTable(tableName);
  if (!table) return;

  for (const column of relatedColumnNames) {
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf(column) !== -1,
    );
    if (foreignKey) await queryRunner.dropForeignKey(tableName, foreignKey);
  }
};

export const getDefaultAdminId = async (queryRunner: QueryRunner) => {
  const result = await queryRunner.query(
    'SELECT id FROM public."user" WHERE username=$1',
    [UserConstants.ADMIN_USERNAME],
  );
  if (!result?.length) throw new NotFoundException('Admin user not found!');
  return result[0].id;
};

export const getSalesmanId = async (queryRunner: QueryRunner) => {
  const result = await queryRunner.query(
    'SELECT id FROM public."user" WHERE username=$1',
    [UserConstants.SALESMAN_USERNAME],
  );
  if (!result?.length) throw new NotFoundException('Salesman user not found!');
  return result[0].id;
};

export const addIndexOnColumns = async (
  queryRunner: QueryRunner,
  columns: {
    [table: string]: string[];
  },
) => {
  for (const table in columns) {
    await Promise.all(
      columns[table].map((col) =>
        queryRunner.query(`
          CREATE INDEX idx_${table}_${col.replace(
            ', ',
            '_',
          )} ON ${table}(${col})
      `),
      ),
    );
  }
};

export const dropColumnIndexes = async (
  queryRunner: QueryRunner,
  columns: {
    [table: string]: string[];
  },
) => {
  for (const table in columns) {
    await Promise.all(
      columns[table].map((col) =>
        queryRunner.query(`DROP INDEX idx_${table}_${col.replace(', ', '_')}`),
      ),
    );
  }
};
