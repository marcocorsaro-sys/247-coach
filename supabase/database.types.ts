// ============================================================================
// Types generati da Supabase per il progetto `irene-tabella-app`.
// NON modificare a mano: rigenerare dopo ogni migration con
//   supabase gen types typescript --project-id rtupetcwvvtzzqxdcjcq
// ============================================================================

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      athlete_categories: {
        Row: {
          athlete_id: string
          category: string
          created_at: string
        }
        Insert: {
          athlete_id: string
          category: string
          created_at?: string
        }
        Update: {
          athlete_id?: string
          category?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_categories_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_disciplines: {
        Row: {
          athlete_id: string
          created_at: string
          discipline: string
          id: string
          is_primary: boolean
        }
        Insert: {
          athlete_id: string
          created_at?: string
          discipline: string
          id?: string
          is_primary?: boolean
        }
        Update: {
          athlete_id?: string
          created_at?: string
          discipline?: string
          id?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "athlete_disciplines_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_fitness: {
        Row: {
          athlete_id: string
          birth_date: string | null
          created_at: string
          css_swim_s_per_100m: number | null
          ftp_watts: number | null
          height_cm: number | null
          lthr: number | null
          max_hr: number | null
          notes: string | null
          resting_hr: number | null
          sex: string | null
          swim_test_400_s: number | null
          threshold_pace_run_s_per_km: number | null
          updated_at: string
          updated_by: string | null
          vo2max: number | null
          weight_kg: number | null
          zone_model: string
        }
        Insert: {
          athlete_id: string
          birth_date?: string | null
          created_at?: string
          css_swim_s_per_100m?: number | null
          ftp_watts?: number | null
          height_cm?: number | null
          lthr?: number | null
          max_hr?: number | null
          notes?: string | null
          resting_hr?: number | null
          sex?: string | null
          swim_test_400_s?: number | null
          threshold_pace_run_s_per_km?: number | null
          updated_at?: string
          updated_by?: string | null
          vo2max?: number | null
          weight_kg?: number | null
          zone_model?: string
        }
        Update: {
          athlete_id?: string
          birth_date?: string | null
          created_at?: string
          css_swim_s_per_100m?: number | null
          ftp_watts?: number | null
          height_cm?: number | null
          lthr?: number | null
          max_hr?: number | null
          notes?: string | null
          resting_hr?: number | null
          sex?: string | null
          swim_test_400_s?: number | null
          threshold_pace_run_s_per_km?: number | null
          updated_at?: string
          updated_by?: string | null
          vo2max?: number | null
          weight_kg?: number | null
          zone_model?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_fitness_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_fitness_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_metrics: {
        Row: {
          athlete_id: string
          created_at: string
          discipline: string | null
          id: string
          metric_key: string
          metric_text: string | null
          metric_value: number | null
          note: string | null
          recorded_at: string
          recorded_by: string | null
          unit: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          discipline?: string | null
          id?: string
          metric_key: string
          metric_text?: string | null
          metric_value?: number | null
          note?: string | null
          recorded_at?: string
          recorded_by?: string | null
          unit?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          discipline?: string | null
          id?: string
          metric_key?: string
          metric_text?: string | null
          metric_value?: number | null
          note?: string | null
          recorded_at?: string
          recorded_by?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_metrics_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_metrics_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_relationships: {
        Row: {
          active: boolean
          athlete_id: string
          coach_id: string
          created_at: string
          id: string
        }
        Insert: {
          active?: boolean
          athlete_id: string
          coach_id: string
          created_at?: string
          id?: string
        }
        Update: {
          active?: boolean
          athlete_id?: string
          coach_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_relationships_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_relationships_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          session_id: string | null
          week_id: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          session_id?: string | null
          week_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          session_id?: string | null
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "training_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          level: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          level?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_color?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          level?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      race_catalog: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
          race_date: string
          race_type: string | null
          region: string | null
          source: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
          race_date: string
          race_type?: string | null
          region?: string | null
          source?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          race_date?: string
          race_type?: string | null
          region?: string | null
          source?: string
          url?: string | null
        }
        Relationships: []
      }
      races: {
        Row: {
          athlete_id: string
          created_at: string
          distance_label: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          priority: string | null
          race_date: string | null
          sport: string | null
          target_time: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          distance_label?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          priority?: string | null
          race_date?: string | null
          sport?: string | null
          target_time?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          distance_label?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          priority?: string | null
          race_date?: string | null
          sport?: string | null
          target_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "races_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_logs: {
        Row: {
          actual_distance_meters: number | null
          actual_duration_seconds: number | null
          athlete_id: string
          athlete_note: string | null
          completed_at: string | null
          created_at: string
          id: string
          rpe_actual: number | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_distance_meters?: number | null
          actual_duration_seconds?: number | null
          athlete_id: string
          athlete_note?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          rpe_actual?: number | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_distance_meters?: number | null
          actual_duration_seconds?: number | null
          athlete_id?: string
          athlete_note?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          rpe_actual?: number | null
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_steps: {
        Row: {
          cadence_rpm: number | null
          distance_meters: number | null
          duration_seconds: number | null
          id: string
          note: string | null
          parent_step_id: string | null
          raw_fragment: string | null
          recovery_text: string | null
          repeat_count: number | null
          session_id: string
          sort_order: number
          step_type: string
          target_high: number | null
          target_low: number | null
          target_type: string | null
          target_unit: string | null
        }
        Insert: {
          cadence_rpm?: number | null
          distance_meters?: number | null
          duration_seconds?: number | null
          id?: string
          note?: string | null
          parent_step_id?: string | null
          raw_fragment?: string | null
          recovery_text?: string | null
          repeat_count?: number | null
          session_id: string
          sort_order?: number
          step_type?: string
          target_high?: number | null
          target_low?: number | null
          target_type?: string | null
          target_unit?: string | null
        }
        Update: {
          cadence_rpm?: number | null
          distance_meters?: number | null
          duration_seconds?: number | null
          id?: string
          note?: string | null
          parent_step_id?: string | null
          raw_fragment?: string | null
          recovery_text?: string | null
          repeat_count?: number | null
          session_id?: string
          sort_order?: number
          step_type?: string
          target_high?: number | null
          target_low?: number | null
          target_type?: string | null
          target_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_steps_parent_step_id_fkey"
            columns: ["parent_step_id"]
            isOneToOne: false
            referencedRelation: "session_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_steps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          day_of_week: number
          discipline: string
          id: string
          intensity_label: string | null
          notes: string | null
          raw_text: string | null
          sort_order: number
          title: string | null
          volume_unit: string | null
          volume_value: string | null
          week_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          discipline: string
          id?: string
          intensity_label?: string | null
          notes?: string | null
          raw_text?: string | null
          sort_order?: number
          title?: string | null
          volume_unit?: string | null
          volume_value?: string | null
          week_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          discipline?: string
          id?: string
          intensity_label?: string | null
          notes?: string | null
          raw_text?: string | null
          sort_order?: number
          title?: string | null
          volume_unit?: string | null
          volume_value?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "training_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      strava_activities: {
        Row: {
          athlete_id: string
          average_cadence: number | null
          average_heartrate: number | null
          average_speed: number | null
          average_watts: number | null
          calories: number | null
          created_at: string
          discipline: string | null
          distance_m: number | null
          elapsed_time_s: number | null
          id: string
          max_heartrate: number | null
          max_speed: number | null
          moving_time_s: number | null
          name: string | null
          raw: Json | null
          sport_type: string | null
          start_date: string | null
          strava_activity_id: number
          total_elevation_gain: number | null
          trainer: boolean | null
        }
        Insert: {
          athlete_id: string
          average_cadence?: number | null
          average_heartrate?: number | null
          average_speed?: number | null
          average_watts?: number | null
          calories?: number | null
          created_at?: string
          discipline?: string | null
          distance_m?: number | null
          elapsed_time_s?: number | null
          id?: string
          max_heartrate?: number | null
          max_speed?: number | null
          moving_time_s?: number | null
          name?: string | null
          raw?: Json | null
          sport_type?: string | null
          start_date?: string | null
          strava_activity_id: number
          total_elevation_gain?: number | null
          trainer?: boolean | null
        }
        Update: {
          athlete_id?: string
          average_cadence?: number | null
          average_heartrate?: number | null
          average_speed?: number | null
          average_watts?: number | null
          calories?: number | null
          created_at?: string
          discipline?: string | null
          distance_m?: number | null
          elapsed_time_s?: number | null
          id?: string
          max_heartrate?: number | null
          max_speed?: number | null
          moving_time_s?: number | null
          name?: string | null
          raw?: Json | null
          sport_type?: string | null
          start_date?: string | null
          strava_activity_id?: number
          total_elevation_gain?: number | null
          trainer?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "strava_activities_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strava_connections: {
        Row: {
          access_token: string
          athlete_firstname: string | null
          athlete_id: string
          athlete_lastname: string | null
          connected_at: string
          expires_at: string
          last_sync_at: string | null
          refresh_token: string
          scope: string | null
          strava_athlete_id: number | null
          updated_at: string
        }
        Insert: {
          access_token: string
          athlete_firstname?: string | null
          athlete_id: string
          athlete_lastname?: string | null
          connected_at?: string
          expires_at: string
          last_sync_at?: string | null
          refresh_token: string
          scope?: string | null
          strava_athlete_id?: number | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          athlete_firstname?: string | null
          athlete_id?: string
          athlete_lastname?: string | null
          connected_at?: string
          expires_at?: string
          last_sync_at?: string | null
          refresh_token?: string
          scope?: string | null
          strava_athlete_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strava_connections_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_weeks: {
        Row: {
          athlete_id: string
          coach_comment: string | null
          coach_id: string | null
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          previous_week_id: string | null
          published_at: string | null
          source_filename: string | null
          status: string
          updated_at: string
          version: number
          week_start: string
        }
        Insert: {
          athlete_id: string
          coach_comment?: string | null
          coach_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          previous_week_id?: string | null
          published_at?: string | null
          source_filename?: string | null
          status?: string
          updated_at?: string
          version?: number
          week_start: string
        }
        Update: {
          athlete_id?: string
          coach_comment?: string | null
          coach_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          previous_week_id?: string | null
          published_at?: string | null
          source_filename?: string | null
          status?: string
          updated_at?: string
          version?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_weeks_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_weeks_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_weeks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_weeks_previous_week_id_fkey"
            columns: ["previous_week_id"]
            isOneToOne: false
            referencedRelation: "training_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_periods: {
        Row: {
          athlete_id: string
          coach_id: string | null
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          label: string | null
          note: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          coach_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          label?: string | null
          note?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          coach_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          label?: string | null
          note?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_periods_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_workouts: {
        Row: {
          created_at: string
          description: string | null
          discipline: string
          id: string
          intensity_label: string | null
          period_id: string
          sort_order: number
          title: string
          volume_value: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discipline: string
          id?: string
          intensity_label?: string | null
          period_id: string
          sort_order?: number
          title: string
          volume_value?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discipline?: string
          id?: string
          intensity_label?: string | null
          period_id?: string
          sort_order?: number
          title?: string
          volume_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacation_workouts_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "vacation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_days: {
        Row: {
          created_at: string
          date: string
          discipline: string
          id: string
          note: string | null
          period_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          date: string
          discipline: string
          id?: string
          note?: string | null
          period_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          date?: string
          discipline?: string
          id?: string
          note?: string | null
          period_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "vacation_days_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "vacation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_picks: {
        Row: {
          athlete_id: string
          athlete_note: string | null
          completed_at: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
          vacation_day_id: string
          vacation_workout_id: string | null
        }
        Insert: {
          athlete_id: string
          athlete_note?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          vacation_day_id: string
          vacation_workout_id?: string | null
        }
        Update: {
          athlete_id?: string
          athlete_note?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          vacation_day_id?: string
          vacation_workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacation_picks_vacation_day_id_fkey"
            columns: ["vacation_day_id"]
            isOneToOne: false
            referencedRelation: "vacation_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_picks_vacation_workout_id_fkey"
            columns: ["vacation_workout_id"]
            isOneToOne: false
            referencedRelation: "vacation_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      coach_activity: {
        Args: never
        Returns: {
          account_created: string
          comments_count: number
          email: string
          full_name: string
          id: string
          last_comment_at: string
          last_log_at: string
          last_sign_in_at: string
          logs_count: number
          role: string
          sessions_total: number
          weeks_published: number
          weeks_total: number
        }[]
      }
      coach_create_athlete: {
        Args: {
          p_email: string
          p_full_name: string
          p_level?: string
          p_password: string
        }
        Returns: string
      }
      coach_delete_athlete: {
        Args: { p_athlete_id: string }
        Returns: undefined
      }
      coach_set_athlete_password: {
        Args: { p_athlete_id: string; p_password: string }
        Returns: undefined
      }
      coach_update_athlete: {
        Args: {
          p_athlete_id: string
          p_email?: string
          p_full_name: string
          p_level?: string
        }
        Returns: undefined
      }
      strava_status: {
        Args: { p_athlete: string }
        Returns: {
          activity_count: number
          athlete_firstname: string
          athlete_lastname: string
          connected: boolean
          connected_at: string
          last_sync_at: string
          scope: string
          strava_athlete_id: number
        }[]
      }
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
