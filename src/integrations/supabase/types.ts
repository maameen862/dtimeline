export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          application_name: string | null
          bookmarked: boolean
          category: string | null
          created_at: string
          device_id: string | null
          duration_seconds: number
          ended_at: string | null
          event_id: string
          event_type: string
          metadata: Json
          productivity: string | null
          started_at: string
          tags: string[]
          user_id: string
        }
        Insert: {
          application_name?: string | null
          bookmarked?: boolean
          category?: string | null
          created_at?: string
          device_id?: string | null
          duration_seconds?: number
          ended_at?: string | null
          event_id?: string
          event_type: string
          metadata?: Json
          productivity?: string | null
          started_at?: string
          tags?: string[]
          user_id: string
        }
        Update: {
          application_name?: string | null
          bookmarked?: boolean
          category?: string | null
          created_at?: string
          device_id?: string | null
          duration_seconds?: number
          ended_at?: string | null
          event_id?: string
          event_type?: string
          metadata?: Json
          productivity?: string | null
          started_at?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          metric: string
          name: string
          threshold_minutes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          metric?: string
          name: string
          threshold_minutes?: number
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          metric?: string
          name?: string
          threshold_minutes?: number
          user_id?: string
        }
        Relationships: []
      }
      application_categories: {
        Row: {
          application_name: string
          category: string
          created_at: string
          id: string
          productivity: string
          user_id: string
        }
        Insert: {
          application_name: string
          category?: string
          created_at?: string
          id?: string
          productivity?: string
          user_id: string
        }
        Update: {
          application_name?: string
          category?: string
          created_at?: string
          id?: string
          productivity?: string
          user_id?: string
        }
        Relationships: []
      }
      device_authorizations: {
        Row: {
          action: string
          created_at: string
          device_id: string | null
          device_name: string | null
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_authorizations_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          app_version: string | null
          auto_sync: boolean
          battery_level: number | null
          category: string
          created_at: string
          device_type: string
          fingerprint: string
          id: string
          last_seen_at: string
          last_sync_at: string | null
          name: string
          network_status: string | null
          os_version: string | null
          platform: string
          status: string
          sync_interval_minutes: number
          tracking_paused: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          auto_sync?: boolean
          battery_level?: number | null
          category?: string
          created_at?: string
          device_type?: string
          fingerprint: string
          id?: string
          last_seen_at?: string
          last_sync_at?: string | null
          name: string
          network_status?: string | null
          os_version?: string | null
          platform?: string
          status?: string
          sync_interval_minutes?: number
          tracking_paused?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          auto_sync?: boolean
          battery_level?: number | null
          category?: string
          created_at?: string
          device_type?: string
          fingerprint?: string
          id?: string
          last_seen_at?: string
          last_sync_at?: string | null
          name?: string
          network_status?: string | null
          os_version?: string | null
          platform?: string
          status?: string
          sync_interval_minutes?: number
          tracking_paused?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      insights: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      parental_locks: {
        Row: {
          created_at: string
          enabled: boolean
          failed_attempts: number
          lock_access: boolean
          lock_delete: boolean
          lock_export: boolean
          locked_until: string | null
          pin_hash: string | null
          pin_salt: string | null
          recovery_email: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          failed_attempts?: number
          lock_access?: boolean
          lock_delete?: boolean
          lock_export?: boolean
          locked_until?: string | null
          pin_hash?: string | null
          pin_salt?: string | null
          recovery_email?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          failed_attempts?: number
          lock_access?: boolean
          lock_delete?: boolean
          lock_export?: boolean
          locked_until?: string | null
          pin_hash?: string | null
          pin_salt?: string | null
          recovery_email?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      privacy_settings: {
        Row: {
          ai_insights_enabled: boolean
          require_device_approval: boolean
          retention_days: number
          track_app_usage: boolean
          track_device_events: boolean
          track_sessions: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_insights_enabled?: boolean
          require_device_approval?: boolean
          retention_days?: number
          track_app_usage?: boolean
          track_device_events?: boolean
          track_sessions?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_insights_enabled?: boolean
          require_device_approval?: boolean
          retention_days?: number
          track_app_usage?: boolean
          track_device_events?: boolean
          track_sessions?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          language: string
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          language?: string
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          period: string
          period_end: string
          period_start: string
          summary: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period?: string
          period_end: string
          period_start: string
          summary?: Json
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period?: string
          period_end?: string
          period_start?: string
          summary?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          created_at: string
          detail: string | null
          device_id: string | null
          events_count: number
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          device_id?: string | null
          events_count?: number
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          device_id?: string | null
          events_count?: number
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_log_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          application_name: string | null
          created_at: string
          direction: string
          id: string
          metric: string
          period: string
          target_minutes: number
          title: string
          user_id: string
        }
        Insert: {
          application_name?: string | null
          created_at?: string
          direction?: string
          id?: string
          metric?: string
          period?: string
          target_minutes?: number
          title: string
          user_id: string
        }
        Update: {
          application_name?: string | null
          created_at?: string
          direction?: string
          id?: string
          metric?: string
          period?: string
          target_minutes?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          auto_sync_enabled: boolean
          auto_sync_interval_minutes: number
          notify_email: string | null
          notify_email_new_device: boolean
          notify_goal_breach: boolean
          notify_new_device: boolean
          notify_new_device_push: boolean
          notify_screen_time_limit: boolean
          notify_sync_failure: boolean
          notify_weekly_report: boolean
          screen_time_limit_minutes: number
          theme: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          auto_sync_enabled?: boolean
          auto_sync_interval_minutes?: number
          notify_email?: string | null
          notify_email_new_device?: boolean
          notify_goal_breach?: boolean
          notify_new_device?: boolean
          notify_new_device_push?: boolean
          notify_screen_time_limit?: boolean
          notify_sync_failure?: boolean
          notify_weekly_report?: boolean
          screen_time_limit_minutes?: number
          theme?: string
          updated_at?: string
          user_id: string
          week_start?: string
        }
        Update: {
          auto_sync_enabled?: boolean
          auto_sync_interval_minutes?: number
          notify_email?: string | null
          notify_email_new_device?: boolean
          notify_goal_breach?: boolean
          notify_new_device?: boolean
          notify_new_device_push?: boolean
          notify_screen_time_limit?: boolean
          notify_sync_failure?: boolean
          notify_weekly_report?: boolean
          screen_time_limit_minutes?: number
          theme?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
