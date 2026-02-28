<template>
  <v-dialog
    v-model="isOpen"
    max-width="600px"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="mr-2" icon="mdi-note-text" />
          Notes for {{ stopName }}
        </div>
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          @click="closeDialog"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Existing Notes List -->
        <div v-if="notes.length > 0" class="mb-4">
          <h4 class="text-h6 mb-2">Existing Notes</h4>
          <v-card
            v-for="note in notes"
            :key="note.id"
            class="mb-2"
            variant="outlined"
          >
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-body-2 font-weight-medium">{{ note.title || 'Untitled Note' }}</span>
                <div class="d-flex align-center gap-2">
                  <v-btn
                    color="primary"
                    icon="mdi-pencil"
                    size="x-small"
                    variant="text"
                    @click="editNote(note)"
                  />
                  <v-btn
                    color="error"
                    icon="mdi-delete"
                    size="x-small"
                    variant="text"
                    @click="deleteNote(note.id)"
                  />
                </div>
              </div>
              <p class="text-body-2 mb-1">{{ note.content }}</p>
              <div class="text-caption text-grey">
                Created: {{ formatDate(note.createdAt) }}
                <span v-if="note.updatedAt !== note.createdAt">
                  • Updated: {{ formatDate(note.updatedAt) }}
                </span>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Add/Edit Note Form -->
        <div>
          <h4 class="text-h6 mb-2">{{ isEditing ? 'Edit Note' : 'Add New Note' }}</h4>
          <v-form ref="noteForm" @submit.prevent="saveNote">
            <v-text-field
              v-model="currentNote.title"
              label="Note Title"
              variant="outlined"
              density="compact"
              class="mb-3"
              :rules="[v => !!v || 'Title is required']"
            />
            
            <v-textarea
              v-model="currentNote.content"
              label="Note Content"
              variant="outlined"
              density="compact"
              rows="4"
              class="mb-3"
              :rules="[v => !!v || 'Content is required']"
            />

            <div class="d-flex justify-end gap-2">
              <v-btn
                v-if="isEditing"
                color="grey"
                variant="outlined"
                @click="cancelEdit"
              >
                Cancel Edit
              </v-btn>
              <v-btn
                color="primary"
                type="submit"
                :loading="saving"
              >
                {{ isEditing ? 'Update Note' : 'Add Note' }}
              </v-btn>
            </div>
          </v-form>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { nextTick } from 'vue'
  
  interface Note {
    id: string
    title: string
    content: string
    createdAt: string
    updatedAt: string
  }

  interface Props {
    modelValue: boolean
    stopId: string
    stopName: string
    notes: Note[]
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'saveNote', stopId: string, note: Partial<Note>): void
    (e: 'updateNote', stopId: string, noteId: string, note: Partial<Note>): void
    (e: 'deleteNote', stopId: string, noteId: string): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // Reactive data
  const noteForm = ref()
  const saving = ref(false)
  const isEditing = ref(false)
  const editingNoteId = ref<string | null>(null)

  const currentNote = ref<Partial<Note>>({
    title: '',
    content: ''
  })

  // Computed
  const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
  })

  // Methods
  const closeDialog = () => {
    isOpen.value = false
    resetForm()
  }

  const resetForm = () => {
    currentNote.value = {
      title: '',
      content: ''
    }
    isEditing.value = false
    editingNoteId.value = null
    
    // Use nextTick to ensure form is reset after DOM updates
    nextTick(() => {
      if (noteForm.value) {
        noteForm.value.resetValidation()
        noteForm.value.reset()
      }
    })
  }

  const editNote = (note: Note) => {
    currentNote.value = {
      title: note.title,
      content: note.content
    }
    isEditing.value = true
    editingNoteId.value = note.id
  }

  const cancelEdit = () => {
    resetForm()
  }

  const saveNote = async () => {
    if (!noteForm.value) return

    const { valid } = await noteForm.value.validate()
    if (!valid) return

    saving.value = true

    try {
      if (isEditing.value && editingNoteId.value) {
        // Update existing note
        emit('updateNote', props.stopId, editingNoteId.value, {
          title: currentNote.value.title,
          content: currentNote.value.content,
          updatedAt: new Date().toISOString()
        })
      } else {
        // Create new note
        emit('saveNote', props.stopId, {
          id: Date.now().toString(),
          title: currentNote.value.title,
          content: currentNote.value.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        
        // Close dialog after adding new note
        isOpen.value = false
      }

      resetForm()
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      saving.value = false
    }
  }

  const deleteNote = (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      emit('deleteNote', props.stopId, noteId)
    }
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Unknown'

    try {
      const date = new Date(dateString)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch {
      return 'Invalid Date'
    }
  }

  // Watch for dialog open/close to reset form
  watch(isOpen, (newValue) => {
    if (!newValue) {
      // Reset form when dialog is closed
      nextTick(() => {
        resetForm()
      })
    }
  })
</script>

<style scoped>
/* Custom styling for notes dialog */
.v-card-title {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.v-card-text {
  max-height: 60vh;
  overflow-y: auto;
}
</style>