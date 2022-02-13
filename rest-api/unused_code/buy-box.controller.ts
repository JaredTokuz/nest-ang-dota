import { Controller, Post, Query, Inject, Injectable, Logger, Get, Param } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { BuyBoxData, MerchantListing } from '@nx-fornida/interfaces';
import { Collection } from 'mongodb';
import { DBLogger } from '../classes/db-logger';
import { DbLoggerMainFields } from '../interfaces/db-logger';
import { AMZN_ALGO_SCHEDULER_LOGS, INV_ZAYNTEK, SALES_ALGO } from '../contants';
import { BuyBoxRepo } from '../repos/buy-box.repo';
import { generalPaginatedSync } from '../functions/general-paginated-sync';
import { makeContext } from '../functions/context';

@Controller('buyBox')
export class BuyBoxController {
	private readonly logger = new Logger(BuyBoxController.name);

	constructor(
		@Inject(INV_ZAYNTEK)
		private readonly inventory: Collection<MerchantListing>,
		private readonly buyBoxRepo: BuyBoxRepo,
		@Inject(AMZN_ALGO_SCHEDULER_LOGS)
		private readonly amznAlgoLogs: Collection<DbLoggerMainFields>,
		@Inject(SALES_ALGO)
		private readonly salesAlgo: Collection<BuyBoxData>
	) {}

	@Cron(CronExpression.EVERY_4_HOURS, {
		name: 'itemOfferMining',
		utcOffset: 0
	})
	async itemOfferMining() {
		generalPaginatedSync({
			limit: 25,
			query: {},
			timeout: 30,
			ctx: makeContext(this.amznAlgoLogs),
			collection: this.inventory,
			processArrayObs$: this.buyBoxRepo.processMultipleRecords$
		});
	}

	@Cron(CronExpression.EVERY_DAY_AT_9PM, {
		name: 'expireAlgoData',
		utcOffset: 0
	})
	async expire() {
		/** expire the amzn algo logs collection */
		await this.amznAlgoLogs
			.deleteMany({
				createdAt: { $lt: new Date(+new Date() - 1000 * 60 * 60 * 24 * 7) }
			})
			.catch((e) => {
				this.logger.log(`Error expiring the amzn algo logs: ${e.toString()}`);
			});
		/** expire the sales algo collection */
		await this.salesAlgo
			.deleteMany({
				date: { $lt: new Date(+new Date() - 1000 * 60 * 60 * 24 * 7) }
			})
			.catch((e) => {
				this.logger.log(`Error expiring the amzn salesAlgo: ${e.toString()}`);
			});
	}

	@Get(':asin')
	async single(@Param('asin') asin: string) {
		return this.buyBoxRepo
			.processRecord$(this.buyBoxRepo.toMerchantListingCtx({ asin }, makeContext(this.amznAlgoLogs)))
			.subscribe();
	}

	@Get('asins')
	async multi(@Query('asins') asins: string[]) {
		return this.buyBoxRepo
			.processMultipleRecords$({
				payload: asins.map((asin) => {
					return { asin };
				}),
				ctx: makeContext(this.amznAlgoLogs)
			})
			.subscribe();
	}
}
