import { Model } from '@nozbe/watermelondb';
import { text, date } from '@nozbe/watermelondb/decorators';

export type TeamRole = 'admin' | 'editor' | 'viewer';

export default class TeamMember extends Model {
  static table = 'team_members';

  @text('email') email!: string;
  @text('username') username!: string;
  @text('role') role!: TeamRole;
  @date('created_at') createdAt!: Date;
  @text('sync_status') syncStatus!: string;

  get canWrite(): boolean {
    return this.role === 'admin' || this.role === 'editor';
  }

  get isAdmin(): boolean {
    return this.role === 'admin';
  }
}
