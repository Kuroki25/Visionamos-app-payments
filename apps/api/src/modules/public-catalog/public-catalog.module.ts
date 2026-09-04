import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommerceEntity } from '../commerces/entities/commerce.entity';
import { PortalEntity } from '../portals/entities/portal.entity';
import { PublicCatalogController } from './public-catalog.controller';
import { PublicCatalogService } from './public-catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([PortalEntity, CommerceEntity])],
  controllers: [PublicCatalogController],
  providers: [PublicCatalogService],
})
export class PublicCatalogModule {}
