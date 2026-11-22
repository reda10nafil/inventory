// Fornitori e clienti per spazio (M10, ticket 07). Contesto piccolo e separato come Categorie e Posizioni, fuori
// dall'elenco di chiavi di InventoryContext. Nei movimenti resta solo l'id del contatto (`contactId`).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { Contact, ContactInput, contactData, contactLabel, contactName, newContactId, parseContacts } from '../utils/contacts';

const STORAGE_KEY = 'furinventory_contacts';

interface ContactsContextType {
  contacts: Contact[];
  loading: boolean;
  /** Aggiunge un contatto (nome e tipo vanno controllati prima con `contactNameError`) e lo restituisce. */
  addContact: (data: ContactInput) => Promise<Contact>;
  /** Cambia i dati: l'id scritto nei movimenti resta lo stesso. */
  updateContact: (id: string, data: ContactInput) => Promise<void>;
  /** Elimina (chi chiama controlla prima che non sia usato nei movimenti, `contactDeleteError`). */
  deleteContact: (id: string) => Promise<void>;
  /** Nome per il report dei movimenti; `undefined` se l'id non è in elenco (il CSV scrive l'id). */
  nameOf: (id: string | undefined) => string | undefined;
  /** «Fornitore Rossi» per il testo dei movimenti; `undefined` se l'id non è in elenco. */
  labelOf: (id: string | undefined) => string | undefined;
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

export function ContactsProvider({ children }: { children: ReactNode }) {
  const { organizationId } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  // Elenco più recente: due modifiche di seguito non partono dalla stessa copia (come le categorie)
  const listRef = useRef(contacts);
  listRef.current = contacts;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const stored = organizationId ? await AsyncStorage.getItem(`${STORAGE_KEY}:${organizationId}`) : null;
        // Nessuna scrittura alla lettura: la chiave nasce al primo contatto creato dall'utente
        if (alive) setContacts(parseContacts(stored));
      } catch (error) {
        console.error('Error loading contacts:', error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [organizationId]);

  const commit = useCallback(async (next: Contact[]) => {
    listRef.current = next;
    setContacts(next);
    try {
      if (organizationId) await AsyncStorage.setItem(`${STORAGE_KEY}:${organizationId}`, JSON.stringify(next));
    } catch (error) {
      console.error('Error saving contacts:', error);
    }
  }, [organizationId]);

  const addContact = useCallback(async (data: ContactInput) => {
    const contact: Contact = { id: newContactId(listRef.current), ...contactData(data) };
    await commit([...listRef.current, contact]);
    return contact;
  }, [commit]);

  const updateContact = useCallback(async (id: string, data: ContactInput) => {
    await commit(listRef.current.map((c) => (c.id === id ? { id, ...contactData(data) } : c)));
  }, [commit]);

  const deleteContact = useCallback(async (id: string) => {
    await commit(listRef.current.filter((c) => c.id !== id));
  }, [commit]);

  const nameOf = useCallback((id: string | undefined) => contactName(contacts, id), [contacts]);
  const labelOf = useCallback((id: string | undefined) => contactLabel(contacts, id), [contacts]);

  const value = useMemo(
    () => ({ contacts, loading, addContact, updateContact, deleteContact, nameOf, labelOf }),
    [contacts, loading, addContact, updateContact, deleteContact, nameOf, labelOf],
  );

  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
}

export function useContacts() {
  const context = useContext(ContactsContext);
  if (context === undefined) throw new Error('useContacts must be used within a ContactsProvider');
  return context;
}
