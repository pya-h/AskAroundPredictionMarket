import { QueryRunner } from 'typeorm';
import { UserConstants } from '../constants/constants';
import { NotFoundException } from '@nestjs/common';

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
