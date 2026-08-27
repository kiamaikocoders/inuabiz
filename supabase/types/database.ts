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
      admin_ai_runs: {
        Row: {
          completion_tokens: number | null
          created_at: string
          created_by: string | null
          estimated_cost_kes: number
          id: string
          input: Json
          model: string | null
          output: Json
          prompt_tokens: number | null
          run_type: string
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          created_by?: string | null
          estimated_cost_kes?: number
          id?: string
          input?: Json
          model?: string | null
          output?: Json
          prompt_tokens?: number | null
          run_type: string
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          created_by?: string | null
          estimated_cost_kes?: number
          id?: string
          input?: Json
          model?: string | null
          output?: Json
          prompt_tokens?: number | null
          run_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_ai_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_impersonation_audit: {
        Row: {
          admin_id: string
          ended_at: string | null
          id: string
          reason: string | null
          started_at: string
          target_profile_id: string | null
          target_tenant_id: string
        }
        Insert: {
          admin_id: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          started_at?: string
          target_profile_id?: string | null
          target_tenant_id: string
        }
        Update: {
          admin_id?: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          started_at?: string
          target_profile_id?: string | null
          target_tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_impersonation_audit_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_impersonation_audit_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_impersonation_audit_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_impersonation_audit_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          created_at: string
          id: string
          insight_type: string
          model: string | null
          payload: Json
          period_end: string
          period_start: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insight_type: string
          model?: string | null
          payload: Json
          period_end: string
          period_start: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insight_type?: string
          model?: string | null
          payload?: Json
          period_end?: string
          period_start?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_invoices: {
        Row: {
          account_reference: string
          amount: number
          billed_email: string | null
          billed_full_name: string
          billed_period: string
          billed_phone: string
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          daraja_response: Json | null
          due_date: string
          external_reference: string
          id: string
          invoice_items: Json | null
          invoice_name: string
          mpesa_receipt: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_transaction_id: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["bill_invoice_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_reference: string
          amount: number
          billed_email?: string | null
          billed_full_name: string
          billed_period: string
          billed_phone: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          daraja_response?: Json | null
          due_date: string
          external_reference: string
          id?: string
          invoice_items?: Json | null
          invoice_name: string
          mpesa_receipt?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_transaction_id?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["bill_invoice_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_reference?: string
          amount?: number
          billed_email?: string | null
          billed_full_name?: string
          billed_period?: string
          billed_phone?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          daraja_response?: Json | null
          due_date?: string
          external_reference?: string
          id?: string
          invoice_items?: Json | null
          invoice_name?: string
          mpesa_receipt?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_transaction_id?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["bill_invoice_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_loyalty_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "bill_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_invoices_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          category: string
          description: string | null
          html: string
          id: string
          name: string
          subject: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          description?: string | null
          html: string
          id: string
          name: string
          subject: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          description?: string | null
          html?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
          topic?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      companion_devices: {
        Row: {
          created_at: string
          created_by: string | null
          expected_msisdn: string | null
          id: string
          label: string
          last_seen_at: string | null
          revoked_at: string | null
          shop_id: string | null
          tenant_id: string
          token_hash: string
          token_prefix: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_msisdn?: string | null
          id?: string
          label?: string
          last_seen_at?: string | null
          revoked_at?: string | null
          shop_id?: string | null
          tenant_id: string
          token_hash: string
          token_prefix: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_msisdn?: string | null
          id?: string
          label?: string
          last_seen_at?: string | null
          revoked_at?: string | null
          shop_id?: string | null
          tenant_id?: string
          token_hash?: string
          token_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_devices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companion_devices_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companion_devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_sms_events: {
        Row: {
          amount: number | null
          created_at: string
          device_id: string
          id: string
          parse_status: string
          raw_body: string
          receipt_code: string | null
          sale_id: string | null
          sender_msisdn: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          device_id: string
          id?: string
          parse_status: string
          raw_body: string
          receipt_code?: string | null
          sale_id?: string | null
          sender_msisdn?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          device_id?: string
          id?: string
          parse_status?: string
          raw_body?: string
          receipt_code?: string | null
          sale_id?: string | null
          sender_msisdn?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_sms_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "companion_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companion_sms_events_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companion_sms_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_entries: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          due_at: string | null
          entry_type: Database["public"]["Enums"]["credit_entry_type"]
          id: string
          note: string | null
          sale_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          due_at?: string | null
          entry_type: Database["public"]["Enums"]["credit_entry_type"]
          id?: string
          note?: string | null
          sale_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          due_at?: string | null
          entry_type?: Database["public"]["Enums"]["credit_entry_type"]
          id?: string
          note?: string | null
          sale_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_loyalty_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "credit_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_entries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          kra_pin: string | null
          name: string | null
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          kra_pin?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          kra_pin?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error: string | null
          id: number
          metadata: Json
          provider_id: string | null
          status: string
          subject: string
          template_id: string
          to_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: number
          metadata?: Json
          provider_id?: string | null
          status?: string
          subject: string
          template_id: string
          to_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: number
          metadata?: Json
          provider_id?: string | null
          status?: string
          subject?: string
          template_id?: string
          to_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          classification_code: string | null
          id: string
          invoice_id: string
          item_description: string
          line_total: number
          qty: number
          sale_item_id: string | null
          tax_class: Database["public"]["Enums"]["tax_class"]
          tenant_id: string
          unit_price: number
          vat_amount: number
        }
        Insert: {
          classification_code?: string | null
          id?: string
          invoice_id: string
          item_description: string
          line_total: number
          qty: number
          sale_item_id?: string | null
          tax_class: Database["public"]["Enums"]["tax_class"]
          tenant_id: string
          unit_price: number
          vat_amount?: number
        }
        Update: {
          classification_code?: string | null
          id?: string
          invoice_id?: string
          item_description?: string
          line_total?: number
          qty?: number
          sale_item_id?: string | null
          tax_class?: Database["public"]["Enums"]["tax_class"]
          tenant_id?: string
          unit_price?: number
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          last_n: number
          tenant_id: string
          year: number
        }
        Insert: {
          last_n?: number
          tenant_id: string
          year: number
        }
        Update: {
          last_n?: number
          tenant_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          cashier_id: string | null
          created_at: string
          customer_kra_pin: string | null
          customer_name: string
          etims_status: Database["public"]["Enums"]["etims_status"]
          exempt_amount: number
          id: string
          invoice_number: string
          kra_control_number: string | null
          kra_qr_code_url: string | null
          mpesa_receipt_code: string | null
          payment_method: string
          sale_id: string
          shop_id: string | null
          subtotal: number
          tenant_id: string
          total_amount: number
          vat_0_amount: number
          vat_16_amount: number
        }
        Insert: {
          cashier_id?: string | null
          created_at?: string
          customer_kra_pin?: string | null
          customer_name?: string
          etims_status?: Database["public"]["Enums"]["etims_status"]
          exempt_amount?: number
          id?: string
          invoice_number: string
          kra_control_number?: string | null
          kra_qr_code_url?: string | null
          mpesa_receipt_code?: string | null
          payment_method: string
          sale_id: string
          shop_id?: string | null
          subtotal: number
          tenant_id: string
          total_amount: number
          vat_0_amount?: number
          vat_16_amount?: number
        }
        Update: {
          cashier_id?: string | null
          created_at?: string
          customer_kra_pin?: string | null
          customer_name?: string
          etims_status?: Database["public"]["Enums"]["etims_status"]
          exempt_amount?: number
          id?: string
          invoice_number?: string
          kra_control_number?: string | null
          kra_qr_code_url?: string | null
          mpesa_receipt_code?: string | null
          payment_method?: string
          sale_id?: string
          shop_id?: string | null
          subtotal?: number
          tenant_id?: string
          total_amount?: number
          vat_0_amount?: number
          vat_16_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel_email: boolean
          channel_in_app: boolean
          channel_sms: boolean
          channel_sound: boolean
          channel_whatsapp: boolean
          created_at: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          channel_email?: boolean
          channel_in_app?: boolean
          channel_sms?: boolean
          channel_sound?: boolean
          channel_whatsapp?: boolean
          created_at?: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          channel_email?: boolean
          channel_in_app?: boolean
          channel_sms?: boolean
          channel_sound?: boolean
          channel_whatsapp?: boolean
          created_at?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          confirmed: boolean
          created_at: string
          email: string
          id: string
          source: string
          unsubscribed_at: string | null
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          email: string
          id?: string
          source?: string
          unsubscribed_at?: string | null
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          email?: string
          id?: string
          source?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["notification_priority"]
          recipient_id: string
          recipient_role: Database["public"]["Enums"]["recipient_role"]
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          recipient_id: string
          recipient_role: Database["public"]["Enums"]["recipient_role"]
          tenant_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          recipient_id?: string
          recipient_role?: Database["public"]["Enums"]["recipient_role"]
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          account: string | null
          amount: number
          api_ref: string | null
          created_at: string
          currency: string
          id: string
          invoice_id: string
          metadata: Json | null
          payment_channel: Database["public"]["Enums"]["payment_channel"]
          purpose: Database["public"]["Enums"]["payment_purpose"]
          raw_webhook_payload: Json | null
          sale_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string | null
          tracking_id: string | null
          updated_at: string
        }
        Insert: {
          account?: string | null
          amount: number
          api_ref?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          metadata?: Json | null
          payment_channel?: Database["public"]["Enums"]["payment_channel"]
          purpose: Database["public"]["Enums"]["payment_purpose"]
          raw_webhook_payload?: Json | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string | null
          tracking_id?: string | null
          updated_at?: string
        }
        Update: {
          account?: string | null
          amount?: number
          api_ref?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          metadata?: Json | null
          payment_channel?: Database["public"]["Enums"]["payment_channel"]
          purpose?: Database["public"]["Enums"]["payment_purpose"]
          raw_webhook_payload?: Json | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string | null
          tracking_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_broadcasts: {
        Row: {
          audience: string
          body: string
          channel: string
          created_at: string
          created_by: string | null
          email_dispatched_at: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          published_at: string | null
          recipient_count: number
          starts_at: string
          status: string
          title: string
        }
        Insert: {
          audience?: string
          body: string
          channel?: string
          created_at?: string
          created_by?: string | null
          email_dispatched_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          published_at?: string | null
          recipient_count?: number
          starts_at?: string
          status?: string
          title: string
        }
        Update: {
          audience?: string
          body?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          email_dispatched_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          published_at?: string | null
          recipient_count?: number
          starts_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attrs: Json
          barcode: string | null
          classification_code: string | null
          cost_price: number
          created_at: string
          id: string
          is_active: boolean
          is_sample: boolean
          low_stock_threshold: number
          name: string
          selling_price: number
          shop_id: string | null
          sku: string | null
          stock_qty: number
          tax_class: Database["public"]["Enums"]["tax_class"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attrs?: Json
          barcode?: string | null
          classification_code?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_sample?: boolean
          low_stock_threshold?: number
          name: string
          selling_price: number
          shop_id?: string | null
          sku?: string | null
          stock_qty?: number
          tax_class?: Database["public"]["Enums"]["tax_class"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attrs?: Json
          barcode?: string | null
          classification_code?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_sample?: boolean
          low_stock_threshold?: number
          name?: string
          selling_price?: number
          shop_id?: string | null
          sku?: string | null
          stock_qty?: number
          tax_class?: Database["public"]["Enums"]["tax_class"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_shop_id: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          onboarding_completed_at: string | null
          pending_shop_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active_shop_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          onboarding_completed_at?: string | null
          pending_shop_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active_shop_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          onboarding_completed_at?: string | null
          pending_shop_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_shop_id_fkey"
            columns: ["active_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ratiba_debit_attempts: {
        Row: {
          amount: number
          attempt_number: number
          created_at: string
          id: string
          payment_transaction_id: string | null
          raw_callback: Json | null
          standing_order_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
          tenant_id: string
        }
        Insert: {
          amount?: number
          attempt_number?: number
          created_at?: string
          id?: string
          payment_transaction_id?: string | null
          raw_callback?: Json | null
          standing_order_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          attempt_number?: number
          created_at?: string
          id?: string
          payment_transaction_id?: string | null
          raw_callback?: Json | null
          standing_order_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratiba_debit_attempts_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratiba_debit_attempts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratiba_debit_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratiba_debit_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          attrs: Json
          classification_code: string | null
          cost_price: number
          id: string
          line_total: number
          product_id: string
          product_name: string
          qty: number
          sale_id: string
          tax_class: Database["public"]["Enums"]["tax_class"]
          tenant_id: string
          unit_price: number
        }
        Insert: {
          attrs?: Json
          classification_code?: string | null
          cost_price?: number
          id?: string
          line_total: number
          product_id: string
          product_name: string
          qty: number
          sale_id: string
          tax_class?: Database["public"]["Enums"]["tax_class"]
          tenant_id: string
          unit_price: number
        }
        Update: {
          attrs?: Json
          classification_code?: string | null
          cost_price?: number
          id?: string
          line_total?: number
          product_id?: string
          product_name?: string
          qty?: number
          sale_id?: string
          tax_class?: Database["public"]["Enums"]["tax_class"]
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_phone: string | null
          discount_amount: number
          id: string
          notes: string | null
          paid_at: string | null
          payment_channel: Database["public"]["Enums"]["payment_channel"] | null
          shop_id: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_channel?:
            | Database["public"]["Enums"]["payment_channel"]
            | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          tenant_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_channel?:
            | Database["public"]["Enums"]["payment_channel"]
            | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_loyalty_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_floor_tables: {
        Row: {
          created_at: string
          id: string
          label: string
          seats: number
          shop_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          seats?: number
          shop_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          seats?: number
          shop_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_floor_tables_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_floor_tables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_floor_tables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_invites: {
        Row: {
          claimed_at: string | null
          created_at: string
          full_name: string | null
          id: string
          invited_by: string | null
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          shop_id: string
          tenant_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          phone: string
          role?: Database["public"]["Enums"]["user_role"]
          shop_id: string
          tenant_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          phone?: string
          role?: Database["public"]["Enums"]["user_role"]
          shop_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_invites_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_tickets: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          items: Json
          kind: string
          sale_id: string | null
          shop_id: string
          status: string
          table_id: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          items?: Json
          kind?: string
          sale_id?: string | null
          shop_id: string
          status?: string
          table_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          items?: Json
          kind?: string
          sale_id?: string | null
          shop_id?: string
          status?: string
          table_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_tickets_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_tickets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_tickets_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "shop_floor_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address_text: string | null
          category: Database["public"]["Enums"]["business_category"]
          created_at: string
          id: string
          is_default: boolean
          location_lat: number | null
          location_lng: number | null
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address_text?: string | null
          category?: Database["public"]["Enums"]["business_category"]
          created_at?: string
          id?: string
          is_default?: boolean
          location_lat?: number | null
          location_lng?: number | null
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address_text?: string | null
          category?: Database["public"]["Enums"]["business_category"]
          created_at?: string
          id?: string
          is_default?: boolean
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          amount_kes: number
          billing_interval: string
          code: string
          created_at: string
          currency: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_kes: number
          billing_interval?: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_kes?: number
          billing_interval?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          auto_debit_enabled: boolean
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_invoice_id: string | null
          next_billing_date: string | null
          plan_code: string
          ratiba_custom_sto_id: string | null
          ratiba_last_attempt_at: string | null
          ratiba_opt_in_phone: string | null
          ratiba_raw_response: Json | null
          ratiba_retry_count: number
          ratiba_standing_order_id: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          auto_debit_enabled?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_invoice_id?: string | null
          next_billing_date?: string | null
          plan_code?: string
          ratiba_custom_sto_id?: string | null
          ratiba_last_attempt_at?: string | null
          ratiba_opt_in_phone?: string | null
          ratiba_raw_response?: Json | null
          ratiba_retry_count?: number
          ratiba_standing_order_id?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          auto_debit_enabled?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_invoice_id?: string | null
          next_billing_date?: string | null
          plan_code?: string
          ratiba_custom_sto_id?: string | null
          ratiba_last_attempt_at?: string | null
          ratiba_opt_in_phone?: string | null
          ratiba_raw_response?: Json | null
          ratiba_retry_count?: number
          ratiba_standing_order_id?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_payment_destinations: {
        Row: {
          account_name: string | null
          account_number: string
          created_at: string
          destination_type: Database["public"]["Enums"]["payment_destination_type"]
          id: string
          is_primary: boolean
          tenant_id: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          created_at?: string
          destination_type: Database["public"]["Enums"]["payment_destination_type"]
          id?: string
          is_primary?: boolean
          tenant_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          created_at?: string
          destination_type?: Database["public"]["Enums"]["payment_destination_type"]
          id?: string
          is_primary?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payment_destinations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_payment_destinations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          access_until: string
          address_text: string | null
          category: Database["public"]["Enums"]["business_category"]
          created_at: string
          email: string | null
          id: string
          kra_pin: string | null
          legal_name: string | null
          location_lat: number | null
          location_lng: number | null
          name: string
          phone: string
          status: Database["public"]["Enums"]["tenant_status"]
          trial_ends_at: string
          updated_at: string
          vat_registered: boolean
        }
        Insert: {
          access_until?: string
          address_text?: string | null
          category?: Database["public"]["Enums"]["business_category"]
          created_at?: string
          email?: string | null
          id?: string
          kra_pin?: string | null
          legal_name?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name: string
          phone: string
          status?: Database["public"]["Enums"]["tenant_status"]
          trial_ends_at?: string
          updated_at?: string
          vat_registered?: boolean
        }
        Update: {
          access_until?: string
          address_text?: string | null
          category?: Database["public"]["Enums"]["business_category"]
          created_at?: string
          email?: string | null
          id?: string
          kra_pin?: string | null
          legal_name?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          phone?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          trial_ends_at?: string
          updated_at?: string
          vat_registered?: boolean
        }
        Relationships: []
      }
      unclaimed_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          payment_transaction_id: string | null
          raw_webhook_payload: Json
          resolved_at: string | null
          resolved_by: string | null
          resolved_tenant_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          payment_transaction_id?: string | null
          raw_webhook_payload: Json
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          payment_transaction_id?: string | null
          raw_webhook_payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unclaimed_payments_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unclaimed_payments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unclaimed_payments_resolved_tenant_id_fkey"
            columns: ["resolved_tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unclaimed_payments_resolved_tenant_id_fkey"
            columns: ["resolved_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_mrr_snapshot: {
        Row: {
          active_tenants: number | null
          conversions_this_month: number | null
          mrr_kes: number | null
          past_due_tenants: number | null
          suspended_tenants: number | null
          trial_tenants: number | null
        }
        Relationships: []
      }
      admin_tenant_map: {
        Row: {
          access_until: string | null
          address_text: string | null
          category: Database["public"]["Enums"]["business_category"] | null
          created_at: string | null
          current_period_end: string | null
          id: string | null
          location_lat: number | null
          location_lng: number | null
          name: string | null
          owner_name: string | null
          phone: string | null
          plan_code: string | null
          status: Database["public"]["Enums"]["tenant_status"] | null
          subscription_amount: number | null
          trial_ends_at: string | null
        }
        Relationships: []
      }
      customer_loyalty_stats: {
        Row: {
          credit_balance: number | null
          customer_id: string | null
          last_paid_at: string | null
          lifetime_spend: number | null
          name: string | null
          paid_sale_count: number | null
          phone: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_tenant_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      complete_vendor_onboarding: {
        Args: {
          p_account_name?: string
          p_account_number: string
          p_address_text?: string
          p_business_name: string
          p_category: Database["public"]["Enums"]["business_category"]
          p_destination_type: Database["public"]["Enums"]["payment_destination_type"]
          p_destinations?: Json
          p_full_name?: string
          p_location_lat?: number
          p_location_lng?: number
          p_phone: string
          p_plan_code?: string
        }
        Returns: Json
      }
      customer_credit_balance: {
        Args: { p_customer_id: string }
        Returns: number
      }
      get_app_secret: { Args: { p_name: string }; Returns: string }
      invite_shop_staff: {
        Args: { p_full_name?: string; p_phone: string; p_shop_id: string }
        Returns: string
      }
      issue_sale_invoice: { Args: { p_sale_id: string }; Returns: string }
      set_active_shop: { Args: { p_shop_id: string }; Returns: undefined }
      subscription_amount_for_tenant: {
        Args: { p_tenant_id: string }
        Returns: number
      }
      plan_amount_kes: {
        Args: { p_code: string }
        Returns: number
      }
      sync_billing_settings_from_plans: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_tenant_subscription_amount: {
        Args: { p_tenant_id: string }
        Returns: number
      }
      tenant_has_access: { Args: { p_tenant_id?: string }; Returns: boolean }
      tenant_is_write_locked: {
        Args: { p_tenant_id?: string }
        Returns: boolean
      }
      upsert_app_secret: {
        Args: { p_name: string; p_value: string }
        Returns: undefined
      }
    }
    Enums: {
      bill_invoice_status: "DRAFT" | "SENT" | "PAID" | "CANCELLED" | "FAILED"
      business_category:
        | "DUKA"
        | "BOUTIQUE"
        | "CHEMIST"
        | "HARDWARE"
        | "EATERY"
        | "OTHER"
        | "ELECTRONICS"
        | "AGRITECH"
        | "SERVICES"
      credit_entry_type: "CHARGE" | "REPAYMENT" | "ADJUSTMENT"
      etims_status: "PENDING_UPGRADE" | "SUBMITTED" | "FAILED"
      notification_priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL"
      notification_type:
        | "SALE"
        | "STOCK_LOW"
        | "SUBSCRIPTION"
        | "SYSTEM"
        | "CREDIT"
        | "PAYMENT"
      payment_channel:
        | "MPESA_STK"
        | "CARD"
        | "PAYBILL"
        | "CASH"
        | "CREDIT"
        | "RATIBA"
        | "BILL_MANAGER"
      payment_destination_type: "PERSONAL_MPESA" | "TILL" | "PAYBILL" | "POCHI"
      payment_purpose:
        | "SAAS_SUBSCRIPTION"
        | "VENDOR_SALE"
        | "OTHER"
        | "BILL_INVOICE"
      payment_status: "PENDING" | "COMPLETE" | "FAILED" | "CANCELLED"
      recipient_role: "SUPER_ADMIN" | "VENDOR_ADMIN" | "CUSTOMER"
      sale_status:
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PAID"
        | "CREDIT"
        | "CANCELLED"
        | "REFUNDED"
      tax_class: "STANDARD_16" | "ZERO_RATED" | "EXEMPT"
      tenant_status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED"
      user_role: "SUPER_ADMIN" | "VENDOR_ADMIN" | "VENDOR_STAFF"
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
    Enums: {
      bill_invoice_status: ["DRAFT", "SENT", "PAID", "CANCELLED", "FAILED"],
      business_category: [
        "DUKA",
        "BOUTIQUE",
        "CHEMIST",
        "HARDWARE",
        "EATERY",
        "OTHER",
        "ELECTRONICS",
        "AGRITECH",
        "SERVICES",
      ],
      credit_entry_type: ["CHARGE", "REPAYMENT", "ADJUSTMENT"],
      etims_status: ["PENDING_UPGRADE", "SUBMITTED", "FAILED"],
      notification_priority: ["LOW", "NORMAL", "HIGH", "CRITICAL"],
      notification_type: [
        "SALE",
        "STOCK_LOW",
        "SUBSCRIPTION",
        "SYSTEM",
        "CREDIT",
        "PAYMENT",
      ],
      payment_channel: [
        "MPESA_STK",
        "CARD",
        "PAYBILL",
        "CASH",
        "CREDIT",
        "RATIBA",
        "BILL_MANAGER",
      ],
      payment_destination_type: ["PERSONAL_MPESA", "TILL", "PAYBILL", "POCHI"],
      payment_purpose: [
        "SAAS_SUBSCRIPTION",
        "VENDOR_SALE",
        "OTHER",
        "BILL_INVOICE",
      ],
      payment_status: ["PENDING", "COMPLETE", "FAILED", "CANCELLED"],
      recipient_role: ["SUPER_ADMIN", "VENDOR_ADMIN", "CUSTOMER"],
      sale_status: [
        "DRAFT",
        "PENDING_PAYMENT",
        "PAID",
        "CREDIT",
        "CANCELLED",
        "REFUNDED",
      ],
      tax_class: ["STANDARD_16", "ZERO_RATED", "EXEMPT"],
      tenant_status: ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED"],
      user_role: ["SUPER_ADMIN", "VENDOR_ADMIN", "VENDOR_STAFF"],
    },
  },
} as const
