export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ShapeType = "dry" | "normal" | "loose";
export type FeelingType = "smooth" | "normal" | "hard" | "urgent";
export type ReminderStyle = "gentle" | "cute";
export type FriendRelationStatus = "pending" | "active" | "removed";
export type InteractionType = "cheer" | "clap" | "heart" | "drink_water";
export type InteractionStatus = "sent" | "read";
export type FriendInviteStatus = "pending" | "accepted" | "expired" | "cancelled";
export type DailyStatusType = "no_poop" | "skip" | "quiet";

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          nickname: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nickname?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nickname?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      poop_records: {
        Row: {
          id: string;
          user_id: string;
          record_time: string;
          record_date: string;
          session_started_at: string | null;
          session_ended_at: string | null;
          duration_seconds: number | null;
          shape_type: ShapeType | null;
          feeling_type: FeelingType | null;
          note: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          record_time?: string;
          record_date?: string;
          session_started_at?: string | null;
          session_ended_at?: string | null;
          duration_seconds?: number | null;
          shape_type?: ShapeType | null;
          feeling_type?: FeelingType | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          record_time?: string;
          record_date?: string;
          session_started_at?: string | null;
          session_ended_at?: string | null;
          duration_seconds?: number | null;
          shape_type?: ShapeType | null;
          feeling_type?: FeelingType | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      friend_aliases: {
        Row: {
          id: string;
          relation_id: string;
          owner_user_id: string;
          target_user_id: string;
          alias_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          relation_id: string;
          owner_user_id: string;
          target_user_id: string;
          alias_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          relation_id?: string;
          owner_user_id?: string;
          target_user_id?: string;
          alias_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_statuses: {
        Row: {
          id: string;
          user_id: string;
          status_date: string;
          status: DailyStatusType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status_date: string;
          status: DailyStatusType;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status_date?: string;
          status?: DailyStatusType;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          reminder_enabled: boolean;
          reminder_time: string | null;
          reminder_style: ReminderStyle;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reminder_enabled?: boolean;
          reminder_time?: string | null;
          reminder_style?: ReminderStyle;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reminder_enabled?: boolean;
          reminder_time?: string | null;
          reminder_style?: ReminderStyle;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      friend_relations: {
        Row: {
          id: string;
          user_id: string;
          friend_user_id: string;
          status: FriendRelationStatus;
          initiator_user_id: string;
          invite_code: string | null;
          created_at: string;
          updated_at: string;
          confirmed_at: string | null;
          removed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          friend_user_id: string;
          status?: FriendRelationStatus;
          initiator_user_id: string;
          invite_code?: string | null;
          created_at?: string;
          updated_at?: string;
          confirmed_at?: string | null;
          removed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          friend_user_id?: string;
          status?: FriendRelationStatus;
          initiator_user_id?: string;
          invite_code?: string | null;
          created_at?: string;
          updated_at?: string;
          confirmed_at?: string | null;
          removed_at?: string | null;
        };
        Relationships: [];
      };
      friend_share_settings: {
        Row: {
          id: string;
          relation_id: string;
          owner_user_id: string;
          share_has_record: boolean;
          share_record_time: boolean;
          share_shape: boolean;
          share_note: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          relation_id: string;
          owner_user_id: string;
          share_has_record?: boolean;
          share_record_time?: boolean;
          share_shape?: boolean;
          share_note?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          relation_id?: string;
          owner_user_id?: string;
          share_has_record?: boolean;
          share_record_time?: boolean;
          share_shape?: boolean;
          share_note?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      friend_interactions: {
        Row: {
          id: string;
          relation_id: string;
          sender_user_id: string;
          receiver_user_id: string;
          target_record_id: string | null;
          interaction_type: InteractionType;
          status: InteractionStatus;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          relation_id: string;
          sender_user_id: string;
          receiver_user_id: string;
          target_record_id?: string | null;
          interaction_type: InteractionType;
          status?: InteractionStatus;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          relation_id?: string;
          sender_user_id?: string;
          receiver_user_id?: string;
          target_record_id?: string | null;
          interaction_type?: InteractionType;
          status?: InteractionStatus;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
      friend_invites: {
        Row: {
          id: string;
          inviter_user_id: string;
          invite_code: string;
          status: FriendInviteStatus;
          expires_at: string | null;
          accepted_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          inviter_user_id: string;
          invite_code: string;
          status?: FriendInviteStatus;
          expires_at?: string | null;
          accepted_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          inviter_user_id?: string;
          invite_code?: string;
          status?: FriendInviteStatus;
          expires_at?: string | null;
          accepted_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_friend_visible_summary: {
        Args: {
          p_relation_id: string;
          p_date: string;
        };
        Returns: {
          has_record: boolean;
          record_time: string | null;
          shape_type: ShapeType | null;
          note: string | null;
        }[];
      };
      get_relation_peer_profile: {
        Args: {
          p_relation_id: string;
        };
        Returns: {
          user_id: string;
          nickname: string | null;
        }[];
      };
    };
    Enums: {
      shape_type: ShapeType;
      feeling_type: FeelingType;
      reminder_style: ReminderStyle;
      friend_relation_status: FriendRelationStatus;
      interaction_type: InteractionType;
      interaction_status: InteractionStatus;
      friend_invite_status: FriendInviteStatus;
    };
  };
}
