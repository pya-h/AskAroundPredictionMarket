import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertPrimaryMarketCategories1734554926817
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO public."market_category" (name, description, icon, parent_id, created_at, updated_at) 
            VALUES 
              ('General', 'Covers all general topics not categorized under specific subjects.', NULL, NULL, NOW(), NOW()),
              ('Sport', 'Includes predictions related to sports events, teams, and athletes.', NULL, NULL, NOW(), NOW()),
              ('Politics', 'Focuses on elections, policies, and political events.', NULL, NULL, NOW(), NOW()),
              ('Weather', 'Encompasses weather-related forecasts and predictions.', NULL, NULL, NOW(), NOW()),
              ('Technology', 'Covers advancements, trends, and events in technology.', NULL, NULL, NOW(), NOW()),
              ('Science', 'Related to scientific discoveries, research, and phenomena.', NULL, NULL, NOW(), NOW()),
              ('Entertainment', 'Includes predictions about movies, music, and celebrities.', NULL, NULL, NOW(), NOW()),
              ('Finance', 'Focuses on markets, investments, and financial events.', NULL, NULL, NOW(), NOW()),
              ('Health', 'Covers health-related topics such as medical advancements and trends.', NULL, NULL, NOW(), NOW()),
              ('Education', 'Related to educational topics, institutions, and trends.', NULL, NULL, NOW(), NOW());`,
    );

    await queryRunner.query(
      `INSERT INTO public."market_category_closure" (id_ancestor, id_descendant)
      SELECT id, id FROM public."market_category";`,
    );

    const queryResult = await queryRunner.query(
      `SELECT id FROM public."market_category" WHERE name = $1`,
      ['Sport'],
    );
    if (!queryResult?.length) return;
    const sportCategoryId = +queryResult[0].id;

    const childCategories = await queryRunner.query(
      `INSERT INTO public."market_category" (name, parent_id, created_at, updated_at) 
              VALUES 
                ('Football', $1, NOW(), NOW()),
                ('Basketball', $1, NOW(), NOW()),
                ('Volleyball', $1, NOW(), NOW())
              RETURNING id;`,
      [sportCategoryId],
    );

    for (const childCategory of childCategories) {
      const childId = childCategory.id;

      await queryRunner.query(
        `INSERT INTO public."market_category_closure" (id_ancestor, id_descendant) VALUES ($1, $1)`,
        [childId],
      );

      await queryRunner.query(
        `INSERT INTO public."market_category_closure" (id_ancestor, id_descendant) VALUES ($1, $2)`,
        [sportCategoryId, childId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM public."market_category_closure"
        WHERE id_descendant IN (
            SELECT id FROM public."market_category" 
            WHERE name IN ('General', 'Sport', 'Politics', 'Weather',
                'Technology', 'Science', 'Entertainment', 'Finance',
                'Health', 'Education', 'Volleyball', 'Basketball', 'Football')
        );
      `,
    );

    await queryRunner.query(
      `DELETE FROM public."market_category" 
        WHERE name IN ('General', 'Sport', 'Politics', 'Weather',
            'Technology', 'Science', 'Entertainment', 'Finance',
            'Health', 'Education', 'Volleyball', 'Basketball', 'Football');
        `,
    );
  }
}
