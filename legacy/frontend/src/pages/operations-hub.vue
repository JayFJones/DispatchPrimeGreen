<template>
  <div>
    <!-- Terminal Selection Header -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card color="primary" dark class="pa-4">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex flex-column">
              <!-- Status Data Row -->
              <div v-if="selectedTerminalId" class="d-flex align-center gap-4 mb-1">
                <div class="d-flex align-center">
                  <v-icon color="success" class="mr-1" size="small">mdi-map-marker-path</v-icon>
                  <span class="text-body-2 font-weight-medium">{{ activeRoutes }} Active Routes</span>
                </div>
                <div class="d-flex align-center">
                  <v-icon color="warning" class="mr-1" size="small">mdi-account-alert</v-icon>
                  <span class="text-body-2 font-weight-medium">{{ routesNeedingDrivers }} Need Drivers</span>
                </div>
                <div v-if="isSelectedDateToday" class="d-flex align-center">
                  <v-icon color="error" class="mr-1" size="small">mdi-account-off</v-icon>
                  <span class="text-body-2 font-weight-medium">{{ driversNotLoggedIn }} Not Logged In</span>
                </div>
              </div>
              <!-- Terminal Name / Fallback -->
              <div class="d-flex align-center">
                <v-icon class="mr-2" size="small">mdi-office-building</v-icon>
                <div class="text-caption text-grey-lighten-2">{{ selectedTerminalName || 'Select Terminal' }}</div>
                <span v-if="selectedTerminalId" class="text-caption text-grey-lighten-2 ml-3">Last Update: {{ lastUpdateTime }}</span>
              </div>
            </div>
            
            <!-- Date Navigation Controls -->
            <div class="d-flex align-center gap-1">
              <v-btn
                icon
                variant="text"
                size="small"
                color="white"
                @click="goToPreviousDay"
              >
                <v-icon>mdi-chevron-left</v-icon>
                <v-tooltip activator="parent" location="bottom">
                  Previous Day
                </v-tooltip>
              </v-btn>
              
              <div class="d-flex align-center px-2">
                <div class="text-center">
                  <div class="text-body-1 font-weight-medium">
                    {{ selectedDateFormatted }}
                  </div>
                  <div class="text-caption text-grey-lighten-2 mt-n1">
                    {{ selectedDateWeekday }}
                  </div>
                </div>
              </div>
              
              <v-btn
                icon
                variant="text"
                size="small"
                color="white"
                @click="goToNextDay"
              >
                <v-icon>mdi-chevron-right</v-icon>
                <v-tooltip activator="parent" location="bottom">
                  Next Day
                </v-tooltip>
              </v-btn>
              
              <v-menu v-model="datePickerMenu" :close-on-content-click="false">
                <template #activator="{ props }">
                  <v-btn
                    icon
                    variant="outlined"
                    size="small"
                    color="white"
                    v-bind="props"
                    class="ml-1"
                  >
                    <v-icon>mdi-calendar</v-icon>
                    <v-tooltip activator="parent" location="bottom">
                      Select Date
                    </v-tooltip>
                  </v-btn>
                </template>
                <v-date-picker
                  v-model="selectedDate"
                  @update:model-value="onDateSelected"
                  show-adjacent-months
                />
              </v-menu>
            </div>
            
            <div class="d-flex align-center gap-3">
              <v-select
                v-model="selectedTerminalId"
                :items="terminalOptions"
                item-title="name"
                item-value="id"
                label="Select Terminal"
                variant="outlined"
                density="compact"
                style="min-width: 250px"
                bg-color="white"
                @update:model-value="onTerminalChange"
                :loading="loadingTerminals"
              >
                <template #prepend-inner>
                  <v-icon color="primary" size="small">mdi-office-building</v-icon>
                </template>
              </v-select>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-heart"
                    variant="text"
                    color="white"
                  >
                    <v-tooltip activator="parent" location="bottom">
                      Favorite Terminals
                    </v-tooltip>
                  </v-btn>
                </template>
                <v-list>
                  <v-list-subheader>Favorite Terminals</v-list-subheader>
                  <v-list-item
                    v-for="fav in favoriteTerminals"
                    :key="fav.id"
                    :title="fav.name"
                    @click="selectTerminal(fav.id)"
                  >
                    <template #prepend>
                      <v-icon color="pink">mdi-heart</v-icon>
                    </template>
                  </v-list-item>
                  <v-divider />
                  <v-list-item
                    title="Manage Favorites"
                    @click="showFavoritesDialog = true"
                  >
                    <template #prepend>
                      <v-icon>mdi-cog</v-icon>
                    </template>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loadingTerminals && terminalOptions.length === 0" class="mb-4">
      <v-col cols="12">
        <v-card class="pa-6 text-center">
          <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
          <h3 class="text-h6 mb-2">Loading Terminals...</h3>
          <p class="text-body-2 text-grey">Fetching available terminals from database</p>
        </v-card>
      </v-col>
    </v-row>

    <!-- No Terminals Available -->
    <v-row v-else-if="!loadingTerminals && terminalOptions.length === 0" class="mb-4">
      <v-col cols="12">
        <v-card color="red-lighten-5" class="pa-6 text-center">
          <v-icon color="red" size="64" class="mb-4">mdi-alert-circle</v-icon>
          <h3 class="text-h5 mb-3">No Terminals Available</h3>
          <p class="text-body-1 mb-4 text-grey-darken-1">
            No terminals found in the database. Contact your administrator to set up terminals.
          </p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Terminal Selection Prompt (when no terminal selected) -->
    <v-row v-else-if="!selectedTerminalId && terminalOptions.length > 0" class="mb-4">
      <v-col cols="12">
        <v-card color="orange-lighten-5" class="pa-6 text-center">
          <v-icon color="orange" size="64" class="mb-4">mdi-office-building-plus</v-icon>
          <h3 class="text-h5 mb-3">Select Your Terminal</h3>
          <p class="text-body-1 mb-4 text-grey-darken-1">
            Choose your home terminal to view operations data. All data is terminal-specific to keep information relevant to your team.
          </p>
          <div class="d-flex justify-center gap-3">
            <v-btn
              color="orange"
              prepend-icon="mdi-home"
              @click="showSetHomeTerminalDialog = true"
              :disabled="terminalOptions.length === 0"
            >
              Set Home Terminal
            </v-btn>
            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-office-building"
              @click="showTerminalListDialog = true"
              :disabled="terminalOptions.length === 0"
            >
              Browse All Terminals
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Terminal-Specific Operations (only show when terminal is selected) -->
    <div v-if="selectedTerminalId">

    <!-- Main Two-Panel Layout -->
    <v-row>
      <!-- Left Panel: Active Routes (Expanded) -->
      <v-col cols="12" lg="8" md="12">
        <!-- Active Routes - Primary Focus -->
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-map-marker-path</v-icon>
            Active Routes
            <v-spacer />
            <v-btn
              v-if="!isHistoricalDate"
              color="error"
              size="small"
              variant="text"
              @click="showCancelRoutesDialog = true"
            >
              <v-icon>mdi-cancel</v-icon>
              <v-tooltip activator="parent" location="bottom">Cancel Routes for {{ selectedDate.toLocaleDateString() }}</v-tooltip>
            </v-btn>
            <v-btn
              color="primary"
              size="small"
              variant="text"
              @click="refreshRouteData"
              :loading="loadingRoutes"
            >
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div v-if="loadingRoutes" class="text-center py-4">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <div v-else-if="activeRoutesList.length === 0" class="text-center py-4 text-grey">
              <v-icon size="48" color="grey-lighten-2">mdi-map-marker-path</v-icon>
              <div class="mt-2">No routes scheduled for {{ selectedDateFormatted }}</div>
              <div class="text-caption">{{ selectedTerminalName }} routes scheduled for {{ todaysDate.split(',')[0] }} will appear here</div>
            </div>
            <div v-else>
              <div v-for="route in activeRoutesList" :key="route.id" class="mb-3 pa-3 border rounded">
                <!-- Route Header with Driver and Icons -->
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="d-flex align-center">
                    <!-- Route ID with Icon -->
                    <div class="d-flex align-center text-body-1 font-weight-medium mr-3">
                      <v-icon color="primary" size="small" class="mr-1">mdi-map-marker-path</v-icon>
                      {{ route.trkid }}
                    </div>
                    
                    <!-- Driver Info with Account Icon -->
                    <div class="d-flex flex-column mr-3">
                      <div class="d-flex align-center">
                        <v-icon :color="route.driverIsSubstitute ? 'orange' : 'primary'" size="small" class="mr-1">mdi-account</v-icon>
                        <span class="text-body-2 font-weight-medium">{{ route.driver?.name || 'Unassigned' }}</span>
                        <v-chip v-if="!route.driver" color="warning" size="x-small" class="ml-1">
                          Needs Driver
                        </v-chip>
                      </div>
                      <v-chip v-if="route.driverIsSubstitute" color="orange" size="x-small" class="mt-1" style="font-size: 10px; height: 16px;">
                        Substitute
                      </v-chip>
                    </div>
                    
                    <!-- Truck Info with Truck Icon -->
                    <div class="d-flex flex-column">
                      <div class="d-flex align-center">
                        <v-icon :color="route.truckIsSubstitute ? 'orange' : 'blue'" size="small" class="mr-1">mdi-truck</v-icon>
                        <span class="text-body-2 font-weight-medium">
                          {{ route.truckNumber || 'No truck assigned' }}
                        </span>
                      </div>
                      <v-chip v-if="route.truckNumber && route.truckIsSubstitute" color="orange" size="x-small" class="mt-1" style="font-size: 10px; height: 16px;">
                        Substitute
                      </v-chip>
                    </div>
                  </div>
                  
                  <!-- Right side: Status chip and action icons -->
                  <div class="d-flex align-center gap-1">
                    <!-- Status Chip -->
                    <v-chip :color="getRouteStatusColor(route.status)" size="small" class="mr-2">
                      {{ route.status }}
                    </v-chip>
                    
                    <!-- Action Icons -->
                    <v-btn
                      v-if="route.driver"
                      size="x-small"
                      variant="text"
                      icon="mdi-message"
                      @click="contactDriver(route)"
                    />
                    <v-btn
                      v-if="route.noteCount > 0"
                      size="x-small"
                      variant="text"
                      @click="openRouteDetails(route)"
                    >
                      <v-badge
                        :content="route.noteCount"
                        color="info"
                        :model-value="route.noteCount > 0"
                        inline
                      >
                        <v-icon color="info">mdi-note-text</v-icon>
                      </v-badge>
                      <v-tooltip activator="parent" location="bottom">{{ route.noteCount }} Stop Note{{ route.noteCount === 1 ? '' : 's' }}</v-tooltip>
                    </v-btn>
                    <v-btn
                      v-if="route.driver"
                      size="x-small"
                      variant="text"
                      icon="mdi-map-marker"
                      @click="viewRouteLocation(route)"
                    />
                    <v-btn
                      size="x-small"
                      variant="text"
                      icon="mdi-open-in-new"
                      @click="openRouteDetails(route)"
                    />
                    <!-- Import Geotab Data button for routes with no data -->
                    <v-btn
                      v-if="route.status === 'No Geotab Data'"
                      size="x-small"
                      color="orange"
                      variant="tonal"
                      :loading="route.importingGeotab"
                      @click="importGeotabData(route)"
                    >
                      <v-icon size="small" class="mr-1">mdi-cloud-download</v-icon>
                      Import Geotab
                      <v-tooltip activator="parent" location="bottom">Import route data from Geotab</v-tooltip>
                    </v-btn>
                  </div>
                </div>

                <!-- Cancellation Details (show when route is cancelled) -->
                <div v-if="route.status === 'Cancelled'" class="mb-3 pa-2 rounded border" style="border-color: rgba(var(--v-theme-error), 0.2); background-color: rgba(var(--v-theme-error), 0.05);">
                  <div class="text-body-2 font-weight-medium mb-1 d-flex align-center">
                    <v-icon color="error" size="16" class="mr-2">mdi-cancel</v-icon>
                    Route Cancelled
                  </div>
                  <div class="text-caption text-grey mb-1">
                    <strong>Reason:</strong> {{ route.routeExecution?.cancellationReason || 'No reason provided' }}
                  </div>
                  <div v-if="route.routeExecution?.cancellationNotes" class="text-caption text-grey">
                    <strong>Notes:</strong> {{ route.routeExecution.cancellationNotes }}
                  </div>
                </div>
                

                <!-- Route Progress -->
                <div class="d-flex align-center justify-space-between text-caption text-grey mb-1">
                  <span>Departure: {{ route.departureTime || 'Not Set' }}</span>
                  <span>ETA: {{ route.eta || 'Calculating...' }}</span>
                </div>
                <v-progress-linear
                  :model-value="route.progressPercent || 0"
                  :color="getRouteProgressColor(route)"
                  height="4"
                  class="mb-1"
                />
                <div class="d-flex align-center justify-space-between text-caption text-grey">
                  <span>{{ route.progressText || 'Not Started' }}</span>
                  <span v-if="route.currentLocation" class="d-flex align-center">
                    <v-icon size="12" color="success" class="mr-1">mdi-map-marker</v-icon>
                    Live GPS
                  </span>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Right Panel: Alerts, Schedule & Communications -->
      <v-col cols="12" lg="4" md="12">
        <!-- Immediate Attention Required -->
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="error">mdi-alert-circle</v-icon>
            Requires Attention
            <v-spacer />
            <v-badge :content="criticalAlerts.length" color="error" :model-value="criticalAlerts.length > 0">
              <v-icon color="error">mdi-bell-alert</v-icon>
            </v-badge>
          </v-card-title>
          <v-card-text>
            <div v-if="criticalAlerts.length === 0" class="text-center py-4 text-grey">
              <v-icon size="32" color="success">mdi-check-circle</v-icon>
              <div class="mt-2 text-caption">All good!</div>
            </div>
            <div v-else>
              <div v-for="alert in criticalAlerts" :key="alert.id" class="mb-2 pa-2 rounded" :class="getAlertClass(alert.type)">
                <div class="d-flex align-center">
                  <v-icon :color="getAlertColor(alert.type)" size="small" class="mr-2">
                    {{ getAlertIcon(alert.type) }}
                  </v-icon>
                  <div class="flex-grow-1">
                    <div class="text-body-2 font-weight-medium">
                      {{ alert.title }}
                      <!-- Date inline for Route Needs Driver alerts -->
                      <span v-if="alert.type === 'route'" class="text-caption text-grey ml-2">
                        <v-icon size="12">mdi-calendar</v-icon>
                        {{ selectedDateFormatted }}
                      </span>
                    </div>
                    <div class="text-caption text-grey">{{ alert.description }}</div>
                  </div>
                  
                  <!-- Inline View Route button for stop alerts -->
                  <div v-if="alert.type !== 'route'" class="ml-2">
                    <v-btn
                      size="small"
                      :color="getAlertColor(alert.type)"
                      variant="outlined"
                      @click="handleAlert(alert)"
                    >
                      {{ alert.actionText }}
                    </v-btn>
                  </div>
                </div>
                
                <!-- Inline Driver Assignment for Route Needs Driver alerts -->
                <div v-if="alert.type === 'route'" class="mt-2">
                  <v-select
                    :model-value="selectedDriverForAlert[alert.id] || null"
                    :items="getDriversForAlert(alert)"
                    item-title="displayName"
                    item-value="_id"
                    label="Select Driver"
                    variant="outlined"
                    density="compact"
                    :loading="loadingAvailableDrivers"
                    :disabled="availableDrivers.length === 0"
                    @update:model-value="(driverId) => selectedDriverForAlert[alert.id] = driverId"
                    @click:menu-activator="availableDrivers.length === 0 && loadAvailableDrivers()"
                  >
                    <template #prepend-inner>
                      <v-icon size="16" color="primary">mdi-account-plus</v-icon>
                    </template>
                    
                    <!-- Action buttons appear when selection is made -->
                    <template #append-inner v-if="selectedDriverForAlert[alert.id]">
                      <div class="d-flex align-center gap-1 ml-2">
                        <v-btn
                          size="small"
                          color="success"
                          icon
                          variant="text"
                          @click="confirmDriverAssignment(alert)"
                        >
                          <v-icon size="small">mdi-check</v-icon>
                          <v-tooltip activator="parent" location="top">Assign Driver</v-tooltip>
                        </v-btn>
                        
                        <v-btn
                          size="small"
                          color="error"
                          icon
                          variant="text"
                          @click="clearDriverSelection(alert.id)"
                        >
                          <v-icon size="small">mdi-close</v-icon>
                          <v-tooltip activator="parent" location="top">Clear Selection</v-tooltip>
                        </v-btn>
                      </div>
                    </template>
                  </v-select>
                </div>

              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Communication Center -->
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="orange">mdi-message-alert</v-icon>
            Communication Center
            <v-spacer />
            <v-badge :content="unreadMessages" color="error" :model-value="unreadMessages > 0">
              <v-btn
                color="orange"
                size="small"
                variant="text"
                @click="openCommunications"
              >
                <v-icon>mdi-message</v-icon>
              </v-btn>
            </v-badge>
          </v-card-title>
          <v-card-text>
            <div v-if="communicationsList.length === 0" class="text-center py-4 text-grey">
              <v-icon size="32" color="grey-lighten-2">mdi-message-outline</v-icon>
              <div class="mt-2 text-caption">No recent communications</div>
            </div>
            <div v-else>
              <div v-for="comm in communicationsList" :key="comm.id" class="mb-2 pa-2 border rounded">
                <div class="d-flex align-center justify-space-between">
                  <div class="text-body-2">{{ comm.subject }}</div>
                  <div class="text-caption text-grey">{{ comm.time }}</div>
                </div>
                <div class="text-caption text-grey mt-1">{{ comm.from }}</div>
              </div>
            </div>
            
            <!-- Quick Broadcast -->
            <v-divider class="my-3" />
            <v-btn
              block
              color="orange"
              variant="outlined"
              prepend-icon="mdi-broadcast"
              @click="showBroadcastDialog = true"
            >
              Send Broadcast Message
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Quick Navigation -->
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-lightning-bolt</v-icon>
            Quick Actions
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item
                v-for="action in quickActions"
                :key="action.title"
                :prepend-icon="action.icon"
                :title="action.title"
                @click="action.action"
                class="px-0"
              >
                <template #append>
                  <v-icon size="small" color="grey">mdi-chevron-right</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    </div> <!-- End terminal-specific operations -->

    <!-- Broadcast Dialog -->
    <v-dialog v-model="showBroadcastDialog" max-width="600">
      <v-card>
        <v-card-title>Send Broadcast Message</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="broadcastMessage"
            label="Message"
            rows="4"
            variant="outlined"
            placeholder="Enter message for all drivers..."
          />
          <v-select
            v-model="broadcastRecipients"
            :items="broadcastOptions"
            label="Recipients"
            multiple
            chips
            variant="outlined"
            class="mt-3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showBroadcastDialog = false">Cancel</v-btn>
          <v-btn color="orange" @click="sendBroadcast" :loading="sendingBroadcast">Send</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Set Home Terminal Dialog -->
    <v-dialog v-model="showSetHomeTerminalDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="orange">mdi-home</v-icon>
          Set Home Terminal
        </v-card-title>
        <v-card-text>
          <p class="text-body-1 mb-4">
            Choose your primary terminal. This will be your default terminal when you open the Operations Hub.
          </p>
          <v-select
            v-model="pendingHomeTerminalId"
            :items="terminalOptions"
            item-title="name"
            item-value="id"
            label="Select Home Terminal"
            variant="outlined"
            :loading="loadingTerminals"
          >
            <template #prepend-inner>
              <v-icon color="orange">mdi-office-building</v-icon>
            </template>
          </v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showSetHomeTerminalDialog = false">Cancel</v-btn>
          <v-btn color="orange" @click="setHomeTerminal" :loading="savingHomeTerminal">Set as Home</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Terminal List Dialog -->
    <v-dialog v-model="showTerminalListDialog" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-office-building</v-icon>
          Select Terminal
        </v-card-title>
        <v-card-text>
          <p class="text-body-1 mb-4">
            Choose a terminal to view its operations data. You can also add terminals to your favorites for quick access.
          </p>
          <v-list>
            <v-list-item
              v-for="terminal in terminalOptions"
              :key="terminal.id"
              :title="terminal.name"
              :subtitle="`${terminal.location}${terminal.agent ? ' (' + terminal.agent + ')' : ''}`"
              @click="selectTerminal(terminal.id)"
            >
              <template #prepend>
                <v-icon color="primary">mdi-office-building</v-icon>
              </template>
              <template #append>
                <v-btn
                  :icon="isFavoriteTerminal(terminal.id) ? 'mdi-heart' : 'mdi-heart-outline'"
                  :color="isFavoriteTerminal(terminal.id) ? 'pink' : 'grey'"
                  variant="text"
                  size="small"
                  @click.stop="toggleFavoriteTerminal(terminal.id)"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showTerminalListDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Manage Favorites Dialog -->
    <v-dialog v-model="showFavoritesDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="pink">mdi-heart</v-icon>
          Manage Favorite Terminals
        </v-card-title>
        <v-card-text>
          <p class="text-body-1 mb-4">
            Add or remove terminals from your favorites for quick access.
          </p>
          <v-list>
            <v-list-item
              v-for="terminal in terminalOptions"
              :key="terminal.id"
              :title="terminal.name"
              :subtitle="`${terminal.location}${terminal.agent ? ' (' + terminal.agent + ')' : ''}`"
            >
              <template #prepend>
                <v-icon color="primary">mdi-office-building</v-icon>
              </template>
              <template #append>
                <v-switch
                  :model-value="isFavoriteTerminal(terminal.id)"
                  color="pink"
                  hide-details
                  @update:model-value="toggleFavoriteTerminal(terminal.id)"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showFavoritesDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Route Details Dialog -->
    <v-dialog v-model="showRouteDetailsDialog" max-width="1200" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-map-marker-path</v-icon>
          Route {{ selectedRouteDetails?.trkid || 'Details' }}
          <v-spacer />
          
          <!-- Date Display -->
          <v-chip color="primary" variant="outlined" class="mr-4">
            <v-icon class="mr-1" size="small">mdi-calendar-check</v-icon>
            {{ selectedDateFormatted }}
          </v-chip>
          
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="showRouteDetailsDialog = false"
          />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text class="pa-0">
          <!-- Loading state -->
          <div v-if="loadingRouteDetails" class="text-center pa-8">
            <v-progress-circular indeterminate color="primary" size="48" />
            <p class="mt-4">Loading route details...</p>
          </div>
          
          <!-- Route details content -->
          <div v-else-if="selectedRouteDetails" class="pa-6">
            <!-- Route Overview Cards -->
            <v-row class="mb-4">
              <!-- Route & Terminal Card -->
              <v-col cols="12" md="3">
                <v-card variant="outlined" class="h-100">
                  <v-card-title class="text-body-1">
                    <v-icon class="mr-2" size="small">mdi-office-building</v-icon>
                    Terminal & Route
                  </v-card-title>
                  <v-card-text class="text-center pa-3">
                    <v-icon class="mb-2" color="blue" size="32">mdi-office-building</v-icon>
                    <p class="text-body-1 font-weight-bold mb-2">{{ selectedTerminalName }}</p>
                    <div class="d-flex align-center justify-center">
                      <v-icon class="mr-1" color="primary" size="16">mdi-map-marker-path</v-icon>
                      <span class="text-body-2 font-weight-medium text-primary">{{ selectedRouteDetails.trkid }}</span>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Driver Card -->
              <v-col cols="12" md="3">
                <v-card variant="outlined" class="h-100">
                  <v-card-title class="text-body-1 d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                      <v-icon class="mr-2" color="green" size="small">mdi-account</v-icon>
                      Assigned Driver
                    </div>
                    <div class="d-flex align-center gap-1">
                      <v-btn 
                        v-if="selectedRouteDriver || selectedRouteReplacement?.driver"
                        size="x-small" 
                        @click="openDriverDetails"
                      >
                        <v-icon color="primary">mdi-open-in-new</v-icon>
                        <v-tooltip activator="parent" location="bottom">View Driver Details</v-tooltip>
                      </v-btn>
                      <v-btn 
                        size="x-small" 
                        @click="editDriverAssignment"
                      >
                        <v-icon color="primary">mdi-pencil</v-icon>
                        <v-tooltip activator="parent" location="bottom">Edit Assignment</v-tooltip>
                      </v-btn>
                      <v-btn 
                        v-if="selectedRouteDriver || selectedRouteReplacement?.driver"
                        size="x-small" 
                        @click="confirmRemoveDriver"
                      >
                        <v-icon color="warning">mdi-account-remove</v-icon>
                        <v-tooltip activator="parent" location="bottom">Remove Driver</v-tooltip>
                      </v-btn>
                    </div>
                  </v-card-title>
                  <v-card-text class="pa-3">
                    <!-- Editing mode: Show driver selection -->
                    <div v-if="editingDriverAssignment">
                      <v-select
                        v-model="selectedReplacementDriverId"
                        :items="availableDrivers"
                        :loading="loadingAvailableDrivers"
                        item-title="displayName"
                        item-value="_id"
                        label="Select replacement driver"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="mb-3"
                      >
                        <template #item="{ item, props }">
                          <v-list-item v-bind="props">
                            <template #prepend>
                              <v-icon color="primary">mdi-account</v-icon>
                            </template>
                            <v-list-item-title>{{ item.raw.firstName }} {{ item.raw.lastName }}</v-list-item-title>
                            <v-list-item-subtitle>{{ item.raw.employeeNo || 'No employee #' }}</v-list-item-subtitle>
                          </v-list-item>
                        </template>
                      </v-select>
                      
                      <div class="d-flex gap-2">
                        <v-btn
                          color="primary"
                          size="small"
                          :loading="savingDriverAssignment"
                          @click="acceptDriverAssignment"
                          :disabled="!selectedReplacementDriverId"
                        >
                          Assign Driver
                        </v-btn>
                        <v-btn
                          variant="outlined"
                          size="small"
                          @click="cancelDriverAssignment"
                        >
                          Cancel
                        </v-btn>
                      </div>
                    </div>
                    
                    <!-- Normal display mode -->
                    <div v-else>
                      <div v-if="selectedRouteDriver" class="text-center">
                        <v-icon class="mb-2" :color="selectedRouteDriverIsSubstitute ? 'orange' : 'green'" size="32">mdi-account-circle</v-icon>
                        <p class="text-body-2 font-weight-bold mb-1">{{ selectedRouteDriver.firstName }} {{ selectedRouteDriver.lastName }}</p>
                        <p v-if="selectedRouteDriver.primaryPhone" class="text-caption text-grey mb-2">{{ selectedRouteDriver.primaryPhone }}</p>
                        <v-chip 
                          :color="selectedRouteDriverIsSubstitute ? 'orange' : 'green'" 
                          size="x-small" 
                          variant="outlined"
                        >
                          {{ selectedRouteDriverIsSubstitute ? 'Substitute' : 'Default' }}
                        </v-chip>
                      </div>
                      <div v-else-if="selectedRouteReplacement?.driver" class="text-center">
                        <v-icon class="mb-2" color="orange" size="32">mdi-account-circle</v-icon>
                        <p class="text-body-2 font-weight-bold mb-1">{{ selectedRouteReplacement.driver.firstName }} {{ selectedRouteReplacement.driver.lastName }}</p>
                        <p v-if="selectedRouteReplacement.driver.primaryPhone" class="text-caption text-grey mb-2">{{ selectedRouteReplacement.driver.primaryPhone }}</p>
                        <v-chip color="orange" size="x-small" variant="outlined">Override</v-chip>
                      </div>
                      <div v-else class="text-center py-2">
                        <v-icon class="mb-2" color="grey" size="32">mdi-account-outline</v-icon>
                        <p class="text-caption text-grey mb-2">No driver assigned</p>
                        <v-chip color="error" size="x-small" variant="outlined">Assignment Needed</v-chip>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Truck Card -->
              <v-col cols="12" md="3">
                <v-card variant="outlined" class="h-100">
                  <v-card-title class="text-body-1 d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                      <v-icon class="mr-2" color="blue" size="small">mdi-truck</v-icon>
                      Assigned Truck
                    </div>
                    <div class="d-flex align-center gap-1">
                      <v-btn 
                        v-if="selectedRouteDetails.truckNumber || selectedRouteReplacement?.truck"
                        size="x-small" 
                        @click="openTruckDetails"
                      >
                        <v-icon color="primary">mdi-open-in-new</v-icon>
                        <v-tooltip activator="parent" location="bottom">View Truck Details</v-tooltip>
                      </v-btn>
                      <v-btn 
                        size="x-small" 
                        @click="editTruckAssignment"
                      >
                        <v-icon color="primary">mdi-pencil</v-icon>
                        <v-tooltip activator="parent" location="bottom">Edit Assignment</v-tooltip>
                      </v-btn>
                    </div>
                  </v-card-title>
                  <v-card-text class="pa-3">
                    <div v-if="editingTruckAssignment">
                      <!-- Inline Truck Selection Form -->
                      <div class="text-center mb-3">
                        <v-icon class="mb-2" color="orange" size="32">mdi-truck-plus</v-icon>
                        <p class="text-body-2 mb-2">Select Replacement Truck</p>
                      </div>
                      
                      <v-select
                        v-model="selectedReplacementTruckNumber"
                        :items="availableTrucks"
                        item-title="displayName"
                        item-value="truckNumber"
                        label="Available Trucks"
                        variant="outlined"
                        density="compact"
                        :loading="loadingAvailableTrucks"
                        :disabled="loadingAvailableTrucks"
                        hide-details
                        class="mb-3"
                      />
                      
                      <div class="d-flex gap-2">
                        <v-btn 
                          variant="tonal" 
                          color="success" 
                          size="small" 
                          block
                          @click="acceptTruckAssignment"
                          :disabled="!selectedReplacementTruckNumber || savingTruckAssignment"
                          :loading="savingTruckAssignment"
                        >
                          Accept
                        </v-btn>
                        <v-btn 
                          variant="tonal" 
                          color="error" 
                          size="small" 
                          block
                          @click="cancelTruckAssignment"
                          :disabled="savingTruckAssignment"
                        >
                          Cancel
                        </v-btn>
                      </div>
                    </div>
                    
                    <div v-else>
                      <!-- Display Current Assignment -->
                      <div v-if="selectedRouteDetails.truckNumber" class="text-center">
                        <v-icon class="mb-2" color="blue" size="32">mdi-truck</v-icon>
                        <p class="text-body-2 font-weight-bold mb-1">{{ selectedRouteDetails.truckNumber }}</p>
                        <p v-if="selectedRouteDetails.subUnitNumber" class="text-caption text-grey mb-2">
                          Sub-unit: {{ selectedRouteDetails.subUnitNumber }}
                        </p>
                        <v-chip color="blue" size="x-small" variant="outlined">Default</v-chip>
                      </div>
                      <div v-else-if="selectedRouteReplacement?.truck" class="text-center">
                        <v-icon class="mb-2" color="orange" size="32">mdi-truck</v-icon>
                        <p class="text-body-2 font-weight-bold mb-1">{{ selectedRouteReplacement.truck.number }}</p>
                        <v-chip color="orange" size="x-small" variant="outlined">Override</v-chip>
                      </div>
                      <div v-else class="text-center py-2">
                        <v-icon class="mb-2" color="grey" size="32">mdi-truck-outline</v-icon>
                        <p class="text-caption text-grey mb-2">No truck assigned</p>
                        <v-chip color="error" size="x-small" variant="outlined">Assignment Needed</v-chip>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Equipment Card -->
              <v-col cols="12" md="3">
                <v-card variant="outlined" class="h-100">
                  <v-card-title class="text-body-1 d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                      <v-icon class="mr-2" size="small">mdi-tools</v-icon>
                      Equipment
                    </div>
                    <v-btn 
                      size="x-small" 
                      @click="editEquipmentAssignment"
                    >
                      <v-icon color="primary">mdi-pencil</v-icon>
                      <v-tooltip activator="parent" location="bottom">Edit Assignment</v-tooltip>
                    </v-btn>
                  </v-card-title>
                  <v-card-text class="pa-3">
                    <div class="d-flex flex-column gap-2">
                      <!-- Scanner -->
                      <div>
                        <div class="d-flex align-center mb-1">
                          <v-icon class="mr-2" color="purple" size="16">mdi-barcode-scan</v-icon>
                          <span class="text-caption font-weight-medium">Scanner</span>
                        </div>
                        <div class="ml-6">
                          <span v-if="selectedRouteDetails.scanner" class="text-caption">{{ selectedRouteDetails.scanner }}</span>
                          <span v-else class="text-grey text-caption">Not assigned</span>
                        </div>
                      </div>
                      
                      <!-- Fuel Card -->
                      <div>
                        <div class="d-flex align-center mb-1">
                          <v-icon class="mr-2" color="orange" size="16">mdi-credit-card</v-icon>
                          <span class="text-caption font-weight-medium">Fuel Card</span>
                        </div>
                        <div class="ml-6">
                          <span v-if="selectedRouteDetails.fuelCard" class="text-caption">{{ selectedRouteDetails.fuelCard }}</span>
                          <span v-else class="text-grey text-caption">Not assigned</span>
                        </div>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Route Stops -->
            <v-card variant="outlined">
              <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-map-marker-multiple</v-icon>
                Route Stops - {{ selectedDateFormatted }} ({{ selectedRouteStops.length }})
                <v-spacer />
                <div class="d-flex align-center text-body-2 text-grey">
                  <div class="d-flex align-center mr-4">
                    <v-icon class="mr-1" size="small">mdi-map-marker-distance</v-icon>
                    <span>{{ formatDistance(selectedRouteDetails.estimatedDistance || 0) }} mi</span>
                  </div>
                  <div class="d-flex align-center">
                    <v-icon class="mr-1" size="small">mdi-clock-check</v-icon>
                    <span>Actual vs Planned</span>
                  </div>
                </div>
              </v-card-title>

              <v-data-table
                :headers="routeDetailsStopHeaders"
                :items="selectedRouteStops"
                item-value="_id"
                :loading="loadingRouteDetails"
                density="compact"
                class="elevation-0"
                :items-per-page="-1"
                hide-default-footer
              >
                <!-- Sequence column -->
                <template #item.sequence="{ item }">
                  <v-chip
                    :color="item.isTerminal ? (item.isStart ? 'green' : 'red') : 'primary'"
                    size="small"
                  >
                    {{ item.isTerminal ? (item.isStart ? 'START' : 'END') : item.sequence }}
                  </v-chip>
                </template>

                <!-- Customer column -->
                <template #item.customer="{ item }">
                  <div>
                    <div class="font-weight-medium text-body-2">{{ item.custName || 'Unknown' }}</div>
                    <div class="text-caption text-grey">{{ item.cid }}</div>
                  </div>
                </template>

                <!-- Address column -->
                <template #item.address="{ item }">
                  <div>
                    <div class="text-body-2">{{ item.address }}</div>
                    <div class="text-caption text-grey">
                      {{ item.city }}, {{ item.state }} {{ item.zipCode }}
                    </div>
                  </div>
                </template>

                <!-- ETA column -->
                <template #item.eta="{ item }">
                  <span class="text-body-2">
                    {{ item.isEnd ? '--' : convertFloatToTime(item.eta) }}
                  </span>
                </template>

                <!-- ETD column -->
                <template #item.etd="{ item }">
                  <span class="text-body-2">
                    {{ item.isStart ? '--' : convertFloatToTime(item.etd) }}
                  </span>
                </template>

                <!-- Status column -->
                <template #item.status="{ item }">
                  <v-chip
                    :color="getStopStatusColor(item.status || 'active')"
                    size="x-small"
                    variant="flat"
                  >
                    {{ getStopStatusText(item.status || 'active') }}
                  </v-chip>
                </template>

                <!-- Notes column -->
                <template #item.notes="{ item }">
                  <div class="d-flex align-center">
                    <div 
                      v-if="item.notes" 
                      class="d-flex align-center cursor-pointer hover-bg-grey-lighten-4 rounded pa-1"
                      @click="editStopNote(item)"
                      style="margin: -4px;"
                    >
                      <v-icon 
                        :color="item.showInAttention ? 'warning' : 'grey'"
                        size="16"
                        class="mr-1"
                      >
                        {{ item.showInAttention ? 'mdi-alert' : 'mdi-note-text' }}
                      </v-icon>
                      <span class="text-caption">{{ item.notes.substring(0, 20) }}{{ item.notes.length > 20 ? '...' : '' }}</span>
                      <v-tooltip activator="parent" location="top">
                        Click to view/edit note: {{ item.notes }}
                      </v-tooltip>
                    </div>
                    <span v-else class="text-grey text-caption">--</span>
                  </div>
                </template>

                <!-- Actions column -->
                <template #item.actions="{ item }">
                  <div class="d-flex align-center gap-1">
                    <v-btn
                      size="x-small"
                      variant="text"
                      @click="editStopNote(item)"
                      :disabled="!isSelectedDateToday && !selectedDate >= new Date()"
                    >
                      <v-icon>mdi-note-edit</v-icon>
                      <v-tooltip activator="parent" location="top">Edit Note</v-tooltip>
                    </v-btn>
                    <v-btn
                      v-if="item.status !== 'skipped'"
                      size="x-small"
                      variant="text"
                      color="warning"
                      @click="skipStop(item)"
                      :disabled="!isSelectedDateToday && !selectedDate >= new Date()"
                    >
                      <v-icon>mdi-cancel</v-icon>
                      <v-tooltip activator="parent" location="top">Skip Stop</v-tooltip>
                    </v-btn>
                    <v-btn
                      v-else
                      size="x-small"
                      variant="text"
                      color="success"
                      @click="restoreStop(item)"
                      :disabled="!isSelectedDateToday && !selectedDate >= new Date()"
                    >
                      <v-icon>mdi-restore</v-icon>
                      <v-tooltip activator="parent" location="top">Restore Stop</v-tooltip>
                    </v-btn>
                  </div>
                </template>
              </v-data-table>
            </v-card>
          </div>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showRouteDetailsDialog = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Error Dialog -->
    <v-dialog v-model="showErrorDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
          {{ errorDialogTitle }}
        </v-card-title>
        
        <v-card-text class="py-4">
          <div class="text-body-1">{{ errorDialogMessage }}</div>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn 
            color="error" 
            variant="elevated"
            @click="showErrorDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Dialog -->
    <v-dialog v-model="showSuccessDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
          {{ successDialogTitle }}
        </v-card-title>
        
        <v-card-text class="py-4">
          <div class="text-body-1">{{ successDialogMessage }}</div>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn 
            color="success" 
            variant="elevated"
            @click="showSuccessDialog = false"
          >
            OK
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Remove Driver Confirmation Dialog -->
    <v-dialog v-model="showRemoveDriverDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="warning" class="mr-2">mdi-account-remove</v-icon>
          Remove Driver Assignment
        </v-card-title>
        
        <v-card-text class="py-4">
          <div class="mb-4">
            <p class="text-body-2 mb-2">
              Remove <strong>{{ selectedRouteDriver?.firstName }} {{ selectedRouteDriver?.lastName }}</strong> from route <strong>{{ selectedRouteDetails?.trkid }}</strong>?
            </p>
            <p class="text-caption text-grey mb-2">
              <v-icon size="12" class="mr-1">mdi-calendar</v-icon>
              Date: {{ selectedDate.toLocaleDateString() }}
            </p>
            <p class="text-caption text-warning">
              This will mark the route as needing a driver assignment. The route will appear in the "Requires Attention" panel.
            </p>
          </div>
        </v-card-text>
        
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn 
            @click="showRemoveDriverDialog = false"
            :disabled="removingDriver"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="warning"
            @click="executeRemoveDriver"
            :loading="removingDriver"
          >
            Remove Driver
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Cancel Routes Dialog -->
    <v-dialog v-model="showCancelRoutesDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="error" class="mr-2">mdi-cancel</v-icon>
          Cancel Routes for {{ selectedDate.toLocaleDateString() }}
        </v-card-title>
        
        <v-card-text class="pt-4">
          <div class="mb-4">
            <p class="text-body-2 mb-2">
              This will cancel <strong>{{ activeRoutesList.length }}</strong> route(s) for the selected date.
            </p>
            <p class="text-caption text-grey">
              Cancelled routes cannot be undone. Please provide a reason for the cancellation.
            </p>
          </div>

          <v-select
            v-model="cancellationReason"
            :items="cancellationReasons"
            label="Cancellation Reason *"
            variant="outlined"
            density="comfortable"
            required
            :disabled="cancellingRoutes"
          />

          <v-textarea
            v-model="cancellationNotes"
            label="Additional Notes (Optional)"
            variant="outlined"
            density="comfortable"
            rows="3"
            placeholder="Optional notes about the cancellation..."
            :disabled="cancellingRoutes"
          />
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn 
            @click="closeCancelRoutesDialog"
            :disabled="cancellingRoutes"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="error"
            @click="confirmCancelRoutes"
            :loading="cancellingRoutes"
            :disabled="!cancellationReason"
          >
            Cancel Routes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Stop Note Dialog -->
    <v-dialog v-model="showEditStopNoteDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-note-edit</v-icon>
          Edit Stop Note
        </v-card-title>
        
        <v-card-text class="pt-4">
          <div class="mb-4">
            <p class="text-body-2 mb-2">
              <strong>Stop:</strong> {{ selectedStop?.custName || 'Terminal' }}
              <span v-if="selectedStop?.isTerminal" class="text-grey"> ({{ selectedStop?.isStart ? 'Start' : 'End' }})</span>
            </p>
            <p class="text-caption text-grey">
              {{ selectedStop?.address }}, {{ selectedStop?.city }}
            </p>
          </div>

          <v-textarea
            v-model="editingStopNote"
            label="Note"
            variant="outlined"
            density="comfortable"
            rows="3"
            placeholder="Enter note for this stop..."
            :disabled="savingStopNote"
          />

          <v-checkbox
            v-model="showNoteInAttention"
            label="Show in Requires Attention panel"
            density="comfortable"
            :disabled="savingStopNote"
          >
            <template #label>
              <span class="text-body-2">Show in Requires Attention panel</span>
              <div class="text-caption text-grey">Check this to highlight this note in the attention panel</div>
            </template>
          </v-checkbox>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-btn 
            v-if="selectedStop?.notes"
            color="error"
            variant="text"
            @click="deleteStopNote"
            :loading="savingStopNote"
          >
            Delete Note
          </v-btn>
          <v-spacer />
          <v-btn 
            @click="closeEditStopNoteDialog"
            :disabled="savingStopNote"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="primary"
            @click="saveStopNote"
            :loading="savingStopNote"
          >
            Save Note
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Skip Stop Dialog -->
    <v-dialog v-model="showSkipStopDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="warning" class="mr-2">mdi-cancel</v-icon>
          Skip Stop
        </v-card-title>
        
        <v-card-text class="pt-4">
          <div class="mb-4">
            <p class="text-body-2 mb-2">
              <strong>Stop:</strong> {{ selectedStop?.custName || 'Terminal' }}
              <span v-if="selectedStop?.isTerminal" class="text-grey"> ({{ selectedStop?.isStart ? 'Start' : 'End' }})</span>
            </p>
            <p class="text-caption text-grey">
              {{ selectedStop?.address }}, {{ selectedStop?.city }}
            </p>
          </div>

          <v-select
            v-model="skipStopReason"
            :items="skipStopReasons"
            label="Reason for Skipping *"
            variant="outlined"
            density="comfortable"
            required
            :disabled="skippingStop"
          />

          <v-textarea
            v-model="skipStopNotes"
            label="Additional Notes (Optional)"
            variant="outlined"
            density="comfortable"
            rows="2"
            placeholder="Optional details about why this stop is being skipped..."
            :disabled="skippingStop"
          />
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn 
            @click="closeSkipStopDialog"
            :disabled="skippingStop"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="warning"
            @click="confirmSkipStop"
            :loading="skippingStop"
            :disabled="!skipStopReason"
          >
            Skip Stop
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'
  import { findTerminalByUrlId, terminalToUrlId, getTerminalObjectId } from '@/utils/terminal-url-helpers'

  const authStore = useAuthStore()
  const router = useRouter()
  const route = useRoute()
  
  // URL parameter initialization functions
  const initializeDateFromUrl = (): Date => {
    const urlDate = route.query.date as string
    if (urlDate) {
      const parsedDate = new Date(urlDate + 'T12:00:00') // Add time to avoid timezone issues
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate
      }
    }
    return new Date() // Default to today
  }

  const initializeTerminalFromUrl = (): string | null => {
    const urlTerminalName = route.query.terminal as string
    if (urlTerminalName && terminalOptions.value.length > 0) {
      // Convert URL terminal name to terminal ID
      const terminalId = getTerminalObjectId(terminalOptions.value, urlTerminalName)
      if (terminalId) {
        return terminalId
      } else {
        console.warn('[OPERATIONS] Terminal not found for URL name:', urlTerminalName)
      }
    }
    return null // Will be set to home terminal or first available terminal later
  }

  // Update URL with current state
  const updateUrlWithParams = (terminalId?: string | null, date?: Date) => {
    const newQuery: any = { ...route.query }
    
    // Update terminal parameter (convert ID to URL-safe name)
    if (terminalId !== undefined) {
      if (terminalId && terminalOptions.value.length > 0) {
        const terminal = terminalOptions.value.find(t => t.id === terminalId)
        if (terminal) {
          const urlTerminalName = terminalToUrlId(terminal)
          newQuery.terminal = urlTerminalName
        } else {
          delete newQuery.terminal
        }
      } else {
        delete newQuery.terminal
      }
    }
    
    // Update date parameter
    if (date !== undefined) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      newQuery.date = dateString
    }
    
    // Update the URL without triggering a page reload
    router.replace({ query: newQuery })
  }
  
  // Terminal selection reactive data (will be initialized from URL after terminals load)
  const loadingTerminals = ref(false)
  const selectedTerminalId = ref<string | null>(null)
  const terminalOptions = ref<any[]>([])
  const favoriteTerminalIds = ref<string[]>([])
  const homeTerminalId = ref<string | null>(null)
  const pendingHomeTerminalId = ref<string | null>(null)
  
  // Terminal dialogs
  const showSetHomeTerminalDialog = ref(false)
  const showTerminalListDialog = ref(false)
  const showFavoritesDialog = ref(false)
  const savingHomeTerminal = ref(false)

  // Date navigation reactive data (initialized from URL)
  const selectedDate = ref(initializeDateFromUrl())
  const datePickerMenu = ref(false)

  // Reactive data (terminal-scoped)
  const loadingDrivers = ref(false)
  const loadingRoutes = ref(false)  
  const loadingSchedule = ref(false)
  const driverStatusList = ref<any[]>([])
  const activeRoutesList = ref<any[]>([])
  const communicationsList = ref<any[]>([])
  const criticalAlerts = ref<any[]>([])

  // Route-focused status counters (terminal-scoped)
  const activeRoutes = computed(() => activeRoutesList.value.length)
  const routesNeedingDrivers = computed(() => activeRoutesList.value.filter(r => r.status !== 'Cancelled' && !r.driver).length)
  const driversNotLoggedIn = computed(() => activeRoutesList.value.filter(r => r.status !== 'Cancelled' && r.driver && r.driverLoginStatus === 'not-logged-in').length)
  const unreadMessages = computed(() => communicationsList.value.filter(c => !c.read).length)

  
  
  // Check if selected date is today
  const isSelectedDateToday = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectedDateOnly = new Date(selectedDate.value)
    selectedDateOnly.setHours(0, 0, 0, 0)
    return selectedDateOnly.getTime() === today.getTime()
  })
  
  // Terminal-specific computed data
  const selectedTerminalName = computed(() => {
    const terminal = terminalOptions.value.find(t => t.id === selectedTerminalId.value)
    return terminal?.name || ''
  })
  
  const selectedTerminalLocation = computed(() => {
    const terminal = terminalOptions.value.find(t => t.id === selectedTerminalId.value)
    return terminal?.location || ''
  })
  
  const favoriteTerminals = computed(() => {
    return terminalOptions.value.filter(t => favoriteTerminalIds.value.includes(t.id))
  })

  // Date formatting for operations status  
  const selectedDateFormatted = computed(() => {
    return selectedDate.value.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  })

  const selectedDateWeekday = computed(() => {
    return selectedDate.value.toLocaleDateString('en-US', { 
      weekday: 'long'
    })
  })

  const todaysDate = computed(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[selectedDate.value.getDay()]
    return `${dayName}, ${selectedDate.value.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })}`
  })

  const isHistoricalDate = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selected = new Date(selectedDate.value)
    selected.setHours(0, 0, 0, 0)
    return selected < today
  })

  const dateContextMessage = computed(() => {
    if (isHistoricalDate.value) {
      return 'Showing historical execution data'
    } else if (selectedDate.value.toDateString() === new Date().toDateString()) {
      return 'Real-time operations data'
    } else {
      return 'Future schedule data'
    }
  })

  // Status bar data
  const lastUpdateTime = ref(new Date().toLocaleTimeString())
  const nextCheckIn = ref('Driver #247 in 15 min')

  // Broadcast dialog
  const showBroadcastDialog = ref(false)
  const broadcastMessage = ref('')
  const broadcastRecipients = ref<string[]>([])
  const sendingBroadcast = ref(false)
  const broadcastOptions = ['All Drivers', 'Active Drivers', 'Offline Drivers', 'Specific Drivers']

  // Route details dialog
  const showRouteDetailsDialog = ref(false)
  const loadingRouteDetails = ref(false)
  const selectedRouteDetails = ref<any>(null)
  const selectedRouteStops = ref<any[]>([])
  const selectedRouteDriver = ref<any>(null)
  const selectedRouteDriverIsSubstitute = ref(false)
  const selectedRouteReplacement = ref<any>(null) // For replacement driver/truck assignments
  
  // Remove driver dialog states
  const showRemoveDriverDialog = ref(false)
  const removingDriver = ref(false)
  
  // Inline editing states
  const editingDriverAssignment = ref(false)
  const availableDrivers = ref<any[]>([])
  const selectedReplacementDriverId = ref<string | null>(null)
  const loadingAvailableDrivers = ref(false)
  const savingDriverAssignment = ref(false)
  
  // Truck assignment states
  const editingTruckAssignment = ref(false)
  const availableTrucks = ref<any[]>([])
  const selectedReplacementTruckNumber = ref<string | null>(null)
  const loadingAvailableTrucks = ref(false)
  const savingTruckAssignment = ref(false)

  // Function to get prioritized driver list for a specific alert
  const getDriversForAlert = (alert: any) => {
    
    if (alert.type !== 'route' || !alert.defaultDriverId) {
      return availableDrivers.value
    }
    
    // Find the route object to check if default driver was explicitly removed
    const route = activeRoutesList.value.find(r => r.id === alert.routeId)
    
    // Even if the driver was removed, we still want to show the default driver
    // at the top as it's a valid option for reassignment
    // (Removed the check for explicitly removed drivers)
    
    const defaultDriver = availableDrivers.value.find(driver => driver._id === alert.defaultDriverId)
    const otherDrivers = availableDrivers.value.filter(driver => driver._id !== alert.defaultDriverId)
    
    
    if (defaultDriver) {
      // Create a modified version of the default driver with a flag
      const defaultDriverWithFlag = {
        ...defaultDriver,
        displayName: `${defaultDriver.displayName} (Default)`
      }
      return [defaultDriverWithFlag, ...otherDrivers]
    }
    
    return availableDrivers.value
  }
  
  // Track selected drivers for each alert
  const selectedDriverForAlert = ref<Record<string, string>>({})

  // Error dialog states
  const showErrorDialog = ref(false)
  const errorDialogTitle = ref('')
  const errorDialogMessage = ref('')

  // Route cancellation dialog states
  const showCancelRoutesDialog = ref(false)
  const cancellationReason = ref('')
  const cancellationNotes = ref('')
  const cancellingRoutes = ref(false)

  // Cancellation reasons
  const cancellationReasons = [
    'Holiday - Business Closed',
    'Weather Conditions',
    'Equipment Failure',
    'Driver Unavailable',
    'Customer Request',
    'Emergency Situation',
    'Route Optimization',
    'Other'
  ]

  // Stop editing dialog states
  const showEditStopNoteDialog = ref(false)
  const showSkipStopDialog = ref(false)
  const selectedStop = ref<any>(null)
  const editingStopNote = ref('')
  const showNoteInAttention = ref(false)
  const savingStopNote = ref(false)
  
  // Skip stop dialog states
  const skipStopReason = ref('')
  const skipStopNotes = ref('')
  const skippingStop = ref(false)

  // Skip stop reasons
  const skipStopReasons = [
    'Customer Closed',
    'Customer Cancelled',
    'Route Optimization',
    'Time Constraints',
    'Equipment Issues',
    'Weather Conditions',
    'Traffic/Road Issues',
    'Emergency Situation',
    'Other'
  ]

  // Helper function to show error dialog
  const showError = (title: string, message: string) => {
    errorDialogTitle.value = title
    errorDialogMessage.value = message
    showErrorDialog.value = true
  }

  // Success dialog states
  const showSuccessDialog = ref(false)
  const successDialogTitle = ref('')
  const successDialogMessage = ref('')

  // Helper function to show success dialog
  const showSuccess = (title: string, message: string) => {
    successDialogTitle.value = title
    successDialogMessage.value = message
    showSuccessDialog.value = true
  }

  // Load available drivers not assigned to routes for the selected date
  const loadAvailableDrivers = async () => {
    try {
      loadingAvailableDrivers.value = true
      
      
      // Get all drivers
      const allDriversResponse = await feathersClient.service('drivers').find({
        query: { $limit: 1000 }
      })
      const allDrivers = Array.isArray(allDriversResponse) ? allDriversResponse : allDriversResponse.data || []
      
      // Get all route executions for the selected date to find assigned drivers
      const dateStr = selectedDate.value.toISOString().split('T')[0]
      
      const executionsResponse = await feathersClient.service('route-executions').find({
        query: { 
          executionDate: dateStr,
          $limit: 1000
        }
      })
      const executions = Array.isArray(executionsResponse) ? executionsResponse : executionsResponse.data || []
      
      // Get assigned driver IDs from executions
      const assignedDriverIds = new Set()
      for (const execution of executions) {
        if (execution.assignedDriverId) {
          assignedDriverIds.add(execution.assignedDriverId)
        }
      }
      
      // Get the route's default driver first if it exists
      const route = selectedRouteDetails.value
      let defaultDriver = null
      if (route?.defaultDriverId) {
        try {
          const driver = await feathersClient.service('drivers').get(route.defaultDriverId)
          defaultDriver = {
            ...driver,
            displayName: `${driver.firstName || 'Unknown'} ${driver.lastName || 'Driver'}${driver.employeeNo ? ` (${driver.employeeNo})` : ''} (Default)`,
            isDefault: true
          }
        } catch (error) {
          console.error(`[DRIVER-ASSIGNMENT] Error loading default driver:`, error)
        }
      }
      
      // Filter to unassigned drivers and format for display
      const unassignedDrivers = allDrivers
        .filter((driver: any) => {
          // Don't filter out the default driver
          if (defaultDriver && driver._id === defaultDriver._id) {
            return false
          }
          const isAssigned = assignedDriverIds.has(driver._id)
          if (isAssigned) {
          }
          return !isAssigned
        })
        .map((driver: any) => ({
          ...driver,
          displayName: `${driver.firstName || 'Unknown'} ${driver.lastName || 'Driver'}${driver.employeeNo ? ` (${driver.employeeNo})` : ''}`,
          isDefault: false
        }))
        .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName))
      
      // Put default driver at the top if it exists
      if (defaultDriver) {
        availableDrivers.value = [defaultDriver, ...unassignedDrivers]
      } else {
        availableDrivers.value = unassignedDrivers
      }
      
    } catch (error) {
      console.error('[DRIVER-ASSIGNMENT] Error loading available drivers:', error)
      // Set empty array on error to prevent UI issues
      availableDrivers.value = []
    } finally {
      loadingAvailableDrivers.value = false
    }
  }

  // Accept the driver assignment and create/update route execution
  const acceptDriverAssignment = async () => {
    
    if (!selectedReplacementDriverId.value || !selectedRouteDetails.value) {
      console.warn('[DRIVER-ASSIGNMENT] Please select a driver')
      return
    }

    try {
      savingDriverAssignment.value = true
      const route = selectedRouteDetails.value
      const dateStr = selectedDate.value.toISOString().split('T')[0]
      const driverId = selectedReplacementDriverId.value
      
      
      
      // Check if route execution already exists for this route/date
      const existingExecutionsResponse = await feathersClient.service('route-executions').find({
        query: {
          routeId: route._id,
          executionDate: dateStr,
          $limit: 1
        }
      })
      
      const existingExecutions = Array.isArray(existingExecutionsResponse) ? 
        existingExecutionsResponse : existingExecutionsResponse.data || []
      
      if (existingExecutions.length > 0) {
        // Update existing route execution with the selected driver
        const execution = existingExecutions[0]
        
        // Always set assignedDriverId to the actual selected driver ID (even if it's the default)
        const updateData = {
          assignedDriverId: driverId
        }
        
        
        // Add timeout to detect hanging requests
        const patchPromise = feathersClient.service('route-executions').patch(execution._id, updateData)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Patch request timed out after 10 seconds')), 10000)
        })
        
        const patchResult = await Promise.race([patchPromise, timeoutPromise])
      } else {
        // Create new route execution with the selected driver
        const newExecution = {
          routeId: route._id,
          executionDate: dateStr,
          terminalId: route.terminalId,
          assignedDriverId: driverId,
          status: 'scheduled',
          stops: [] // Initialize with empty stops array - will be populated by hooks
        }
        
        const created = await feathersClient.service('route-executions').create(newExecution)
      }
      
      // Exit editing mode and refresh data
      editingDriverAssignment.value = false
      
      // Refresh the route details to show updated assignment
      await loadRouteDetails(route._id)
      
      // Refresh the main operations hub page to show updated assignment
      await refreshRouteData()
      
    } catch (error: any) {
      console.error('[DRIVER-ASSIGNMENT] Error saving driver assignment:', error)
      console.error('[DRIVER-ASSIGNMENT] Error type:', typeof error)
      console.error('[DRIVER-ASSIGNMENT] Error details:', JSON.stringify(error, null, 2))
      
      // Extract meaningful error message
      let errorMessage = 'An unknown error occurred while saving the driver assignment.'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.error?.message) {
        errorMessage = error.error.message
      } else if (error?.data) {
        errorMessage = `Validation failed: ${JSON.stringify(error.data)}`
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      console.error('[DRIVER-ASSIGNMENT] Final error message:', errorMessage)
      
      // Show error dialog
      showError('Driver Assignment Failed', errorMessage)
      
      // Reset editing state on error so user can try again
      editingDriverAssignment.value = false
      selectedReplacementDriverId.value = null
      availableDrivers.value = []
    } finally {
      savingDriverAssignment.value = false
    }
  }

  // Cancel driver assignment editing
  const cancelDriverAssignment = () => {
    editingDriverAssignment.value = false
    selectedReplacementDriverId.value = null
    availableDrivers.value = []
  }

  // Clear driver assignment (remove driver from route)
  const clearDriverAssignment = async () => {
    
    if (!selectedRouteDetails.value) {
      console.warn('[DRIVER-ASSIGNMENT] No route selected')
      return
    }

    try {
      savingDriverAssignment.value = true
      const route = selectedRouteDetails.value
      const dateStr = selectedDate.value.toISOString().split('T')[0]
      

      // Find existing route-execution record
      const executionResponse = await feathersClient.service('route-executions').find({
        query: {
          routeId: route._id,
          executionDate: dateStr,
          $limit: 1
        }
      })
      
      const executions = Array.isArray(executionResponse) ? executionResponse : executionResponse.data || []
      
      if (executions.length > 0) {
        // Update existing route-execution to remove driver
        const execution = executions[0]
        
        await feathersClient.service('route-executions').patch(execution._id, {
          assignedDriverId: null,
          updatedAt: new Date().toISOString()
        })
      } else {
        // Create new route-execution with no driver assignment
        
        await feathersClient.service('route-executions').create({
          routeId: route._id,
          executionDate: dateStr,
          terminalId: selectedTerminalId.value,
          status: 'scheduled'
          // assignedDriverId is omitted (optional field)
        })
      }
      
      
      // Exit editing mode and refresh data
      editingDriverAssignment.value = false
      selectedReplacementDriverId.value = null
      availableDrivers.value = []
      
      // Refresh the route details to show cleared assignment
      await loadRouteDetails(route._id)
      
      // Refresh the main operations hub page 
      await refreshRouteData()
      
      // Ensure available drivers are loaded for alert dropdowns
      await loadAvailableDrivers()
      
      
    } catch (error: any) {
      console.error('[DRIVER-ASSIGNMENT] Error clearing driver assignment:', error)
      
      let errorMessage = 'An unknown error occurred while clearing the driver assignment.'
      if (error.message) {
        errorMessage = error.message
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message
      }
      
      showError('Clear Driver Failed', errorMessage)
      
      // Reset editing state on error
      editingDriverAssignment.value = false
      selectedReplacementDriverId.value = null
      availableDrivers.value = []
    } finally {
      savingDriverAssignment.value = false
    }
  }

  // Show remove driver confirmation dialog
  const confirmRemoveDriver = () => {
    showRemoveDriverDialog.value = true
  }

  // Execute remove driver operation
  const executeRemoveDriver = async () => {
    
    if (!selectedRouteDetails.value) {
      console.warn('[REMOVE-DRIVER] No route selected')
      return
    }

    try {
      removingDriver.value = true
      const route = selectedRouteDetails.value
      const dateStr = selectedDate.value.toISOString().split('T')[0]
      

      // Find existing route-execution record
      const executionResponse = await feathersClient.service('route-executions').find({
        query: {
          routeId: route._id,
          executionDate: dateStr,
          $limit: 1
        }
      })
      
      const executions = Array.isArray(executionResponse) ? executionResponse : executionResponse.data || []
      
      if (executions.length > 0) {
        // Update existing route-execution to remove driver
        const execution = executions[0]
        
        await feathersClient.service('route-executions').patch(execution._id, {
          assignedDriverId: null,
          updatedAt: new Date().toISOString()
        })
      } else {
        // Create new route-execution with no driver assignment
        
        await feathersClient.service('route-executions').create({
          routeId: route._id,
          executionDate: dateStr,
          terminalId: selectedTerminalId.value,
          status: 'scheduled'
          // assignedDriverId is omitted (optional field)
        })
      }
      
      
      // Close the confirmation dialog
      showRemoveDriverDialog.value = false
      
      // Refresh the route details to show removed assignment
      await loadRouteDetails(route._id)
      
      // Refresh the main operations hub page 
      await refreshRouteData()
      
      // Ensure available drivers are loaded for alert dropdowns
      await loadAvailableDrivers()
      
      
    } catch (error: any) {
      console.error('[REMOVE-DRIVER] Error removing driver assignment:', error)
      
      let errorMessage = 'An unknown error occurred while removing the driver assignment.'
      if (error.message) {
        errorMessage = error.message
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message
      }
      
      showError('Remove Driver Failed', errorMessage)
      
    } finally {
      removingDriver.value = false
    }
  }

  // Confirm driver assignment from alert panel
  const confirmDriverAssignment = async (alert: any) => {
    const driverId = selectedDriverForAlert.value[alert.id]
    if (!driverId) return

    try {
      
      // Extract route ID from alert ID (format: route-{routeId})
      const routeId = alert.id.replace('route-', '')
      
      const dateStr = selectedDate.value.toISOString().split('T')[0]
      
      // Find or create route-execution record
      const executionResponse = await feathersClient.service('route-executions').find({
        query: {
          routeId: routeId,
          executionDate: dateStr,
          $limit: 1
        }
      })
      
      const executions = Array.isArray(executionResponse) ? executionResponse : executionResponse.data || []
      
      if (executions.length > 0) {
        // Update existing route-execution
        await feathersClient.service('route-executions').patch(executions[0]._id, {
          assignedDriverId: driverId,
          updatedAt: new Date().toISOString()
        })
      } else {
        // Create new route-execution
        await feathersClient.service('route-executions').create({
          routeId: routeId,
          executionDate: dateStr,
          terminalId: selectedTerminalId.value,
          assignedDriverId: driverId,
          status: 'scheduled'
        })
      }
      
      
      // Clear the selection and refresh route data
      delete selectedDriverForAlert.value[alert.id]
      await refreshRouteData()
      
    } catch (error) {
      console.error('Error assigning driver from alert:', error)
      showError('Driver Assignment Failed', 'Failed to assign driver. Please try again.')
    }
  }

  // Clear driver selection for an alert
  const clearDriverSelection = (alertId: string) => {
    delete selectedDriverForAlert.value[alertId]
  }

  // Load available trucks not assigned to routes for the selected date
  const loadAvailableTrucks = async () => {
    try {
      loadingAvailableTrucks.value = true
      
      
      // Get all equipment (trucks)
      const allEquipmentResponse = await feathersClient.service('equipment').find({
        query: { $limit: 1000 }
      })
      const allEquipment = Array.isArray(allEquipmentResponse) ? allEquipmentResponse : allEquipmentResponse.data || []
      
      // Get all route executions for the selected date to find assigned trucks
      const dateStr = selectedDate.value.toISOString().split('T')[0]
      
      const executionsResponse = await feathersClient.service('route-executions').find({
        query: { 
          executionDate: dateStr,
          $limit: 1000
        }
      })
      const executions = Array.isArray(executionsResponse) ? executionsResponse : executionsResponse.data || []
      
      // Get assigned truck numbers from executions
      const assignedTruckNumbers = new Set()
      for (const execution of executions) {
        if (execution.assignedTruckNumber) {
          assignedTruckNumbers.add(execution.assignedTruckNumber)
        }
      }
      
      // Get the route's default truck first if it exists
      const route = selectedRouteDetails.value
      let defaultTruck = null
      
      if (route && route.truckNumber) {
        const matchingTruck = allEquipment.find((truck: any) => truck.equipmentNumber === route.truckNumber)
        if (matchingTruck) {
          defaultTruck = matchingTruck
        }
      }
      
      // Filter available trucks (not assigned to other routes, but include default truck)
      const unassignedTrucks = allEquipment.filter((truck: any) => {
        const isDefaultTruck = route && truck.equipmentNumber === route.truckNumber
        const isAssigned = assignedTruckNumbers.has(truck.equipmentNumber)
        return isDefaultTruck || !isAssigned
      })
      
      
      // Build the options array with default truck first
      const options = []
      
      // Add default truck first with "(Default)" label
      if (defaultTruck) {
        options.push({
          ...defaultTruck,
          displayName: `${defaultTruck.equipmentNumber} (Default)`,
          truckNumber: defaultTruck.equipmentNumber,
          isDefault: true
        })
      }
      
      // Add other available trucks
      for (const truck of unassignedTrucks) {
        if (!defaultTruck || truck.equipmentNumber !== defaultTruck.equipmentNumber) {
          options.push({
            ...truck,
            displayName: truck.equipmentNumber,
            truckNumber: truck.equipmentNumber,
            isDefault: false
          })
        }
      }
      
      availableTrucks.value = options
      
    } catch (error) {
      console.error('[TRUCK-ASSIGNMENT] Error loading available trucks:', error)
      // Set empty array on error to prevent UI issues
      availableTrucks.value = []
    } finally {
      loadingAvailableTrucks.value = false
    }
  }

  // Accept the truck assignment and create/update route execution
  const acceptTruckAssignment = async () => {
    if (!selectedReplacementTruckNumber.value || !selectedRouteDetails.value) {
      console.warn('[TRUCK-ASSIGNMENT] Please select a truck')
      return
    }

    try {
      savingTruckAssignment.value = true
      const route = selectedRouteDetails.value
      const dateStr = selectedDate.value.toISOString().split('T')[0]
      const truckNumber = selectedReplacementTruckNumber.value
      
      
      // Check if route execution already exists for this route/date
      const existingExecutionsResponse = await feathersClient.service('route-executions').find({
        query: {
          routeId: route._id,
          executionDate: dateStr,
          $limit: 1
        }
      })
      
      const existingExecutions = Array.isArray(existingExecutionsResponse) ? 
        existingExecutionsResponse : existingExecutionsResponse.data || []
      
      if (existingExecutions.length > 0) {
        // Update existing route execution
        const execution = existingExecutions[0]
        await feathersClient.service('route-executions').patch(execution._id, {
          assignedTruckNumber: truckNumber
        })
      } else {
        // Create new route execution
        const newExecution = {
          routeId: route._id,
          executionDate: dateStr,
          terminalId: route.terminalId,
          assignedTruckNumber: truckNumber,
          status: 'scheduled',
          stops: [] // Initialize with empty stops array - will be populated by hooks
        }
        
        
        const created = await feathersClient.service('route-executions').create(newExecution)
      }
      
      // Exit editing mode and refresh data
      editingTruckAssignment.value = false
      
      // Refresh the route details to show updated assignment
      await loadRouteDetails(route._id)
      
      // Refresh the main operations hub page to show updated assignment
      await refreshRouteData()
      
    } catch (error: any) {
      console.error('[TRUCK-ASSIGNMENT] Error saving truck assignment:', error)
      
      // Extract meaningful error message
      let errorMessage = 'An unknown error occurred while saving the truck assignment.'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.error?.message) {
        errorMessage = error.error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      // Show error dialog
      showError('Truck Assignment Failed', errorMessage)
      
      // Reset editing state on error so user can try again
      editingTruckAssignment.value = false
      selectedReplacementTruckNumber.value = null
      availableTrucks.value = []
    } finally {
      savingTruckAssignment.value = false
    }
  }

  // Cancel truck assignment editing
  const cancelTruckAssignment = () => {
    editingTruckAssignment.value = false
    selectedReplacementTruckNumber.value = null
    availableTrucks.value = []
  }

  // Route details table headers
  const routeDetailsStopHeaders = [
    { title: 'Seq', key: 'sequence', sortable: true, width: '80px' },
    { title: 'Status', key: 'status', sortable: false, width: '100px' },
    { title: 'Customer', key: 'customer', sortable: false },
    { title: 'Address', key: 'address', sortable: false },
    { title: 'ETA', key: 'eta', sortable: false, width: '100px' },
    { title: 'ETD', key: 'etd', sortable: false, width: '100px' },
    { title: 'Notes', key: 'notes', sortable: false, width: '120px' },
    { title: 'Actions', key: 'actions', sortable: false, width: '120px' }
  ]

  // Real terminals data interface
  interface Terminal {
    _id: string
    name: string
    city?: string
    state?: string
    agent?: string
    cName?: string
    streetAddress?: string
    timeZone?: string
    leaders?: Array<{ name: string; title: string }>
  }

  // Helper function to check if a route is scheduled for today (copied from dispatch.vue)
  const isRouteScheduledForToday = (route: any, today: string, dateObj?: Date): boolean => {
    // Use the provided date object directly to avoid timezone parsing issues
    const todayDate = dateObj || new Date(today + 'T12:00:00')
    const dayOfWeek = todayDate.getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']


    let isScheduled = false
    switch (dayOfWeek) {
      case 0: { isScheduled = route.sun === true || route.sun === 1; break }
      case 1: { isScheduled = route.mon === true || route.mon === 1; break }
      case 2: { isScheduled = route.tue === true || route.tue === 1; break }
      case 3: { isScheduled = route.wed === true || route.wed === 1; break }
      case 4: { isScheduled = route.thu === true || route.thu === 1; break }
      case 5: { isScheduled = route.fri === true || route.fri === 1; break }
      case 6: { isScheduled = route.sat === true || route.sat === 1; break }
      default: { isScheduled = false }
    }

    return isScheduled
  }

  // Date navigation methods
  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate.value)
    previousDay.setDate(previousDay.getDate() - 1)
    selectedDate.value = previousDay
    updateUrlWithParams(undefined, selectedDate.value)
    onDateChanged()
  }

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate.value)
    nextDay.setDate(nextDay.getDate() + 1)
    selectedDate.value = nextDay
    updateUrlWithParams(undefined, selectedDate.value)
    onDateChanged()
  }

  const onDateSelected = (date: Date) => {
    datePickerMenu.value = false
    selectedDate.value = date
    updateUrlWithParams(undefined, selectedDate.value)
    onDateChanged()
  }

  const onDateChanged = () => {
    // Reload route data for the new date
    if (selectedTerminalId.value) {
      refreshRouteData()
    }
  }

  // Real route data loading from database
  const refreshRouteData = async () => {
    if (!selectedTerminalId.value) return

    try {
      loadingRoutes.value = true

      const routesResponse = await feathersClient.service('routes').find({
        query: { 
          terminalId: selectedTerminalId.value,
          $limit: 1000
        }
      })

      const routes = Array.isArray(routesResponse.data) ? routesResponse.data : [routesResponse]
      
      // Filter routes for selected date's schedule
      const selectedDateString = selectedDate.value.toISOString().split('T')[0] // YYYY-MM-DD format
      const scheduledRoutes = routes.filter(route => {
        const isScheduled = isRouteScheduledForToday(route, selectedDateString, selectedDate.value)
        if (!isScheduled) {
        }
        return isScheduled
      })
      
      const dateDisplayName = selectedDate.value.toDateString() === new Date().toDateString() ? 'today' : selectedDateString
      
      // Load driver data for routes with assignments
      const routesWithDrivers = []
      for (const route of scheduledRoutes) {
        let driverInfo = null
        let driverLoginStatus = 'unassigned'
        let effectiveDriverId = route.defaultDriverId
        let effectiveTruckNumber = route.truckNumber
        let truckIsSubstitute = false
        
        // Check for route-execution override for this specific date
        let routeExecution = null
        try {
          const executionResponse = await feathersClient.service('route-executions').find({
            query: {
              routeId: route._id,
              executionDate: selectedDateString,
              $limit: 1
            }
          })
          
          const executions = Array.isArray(executionResponse) ? executionResponse : executionResponse.data || []
          if (executions.length > 0) {
            routeExecution = executions[0]
            
            // Route-execution exists, so use its driver assignment (even if undefined/null)
            if (routeExecution.assignedDriverId) {
              effectiveDriverId = routeExecution.assignedDriverId
            } else {
              // Route-execution exists but has no driver assigned (driver was removed)
              effectiveDriverId = null
            }
            
            if (routeExecution.assignedTruckNumber) {
              effectiveTruckNumber = routeExecution.assignedTruckNumber
              truckIsSubstitute = effectiveTruckNumber !== route.truckNumber
            }
          } else {
          }
        } catch (error) {
          console.error(`[OPERATIONS] Error checking route-execution for route ${route.trkid}:`, error)
        }
        
        if (effectiveDriverId) {
          try {
            const driver = await feathersClient.service('drivers').get(effectiveDriverId)
            driverInfo = {
              id: driver._id,
              name: `${driver.firstName} ${driver.lastName}`,
              phone: driver.primaryPhone || 'Not available'
            }
            
            // Only check driver login status for today's date
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const selectedDateOnly = new Date(selectedDate.value)
            selectedDateOnly.setHours(0, 0, 0, 0)
            const isToday = selectedDateOnly.getTime() === today.getTime()
            
            if (isToday) {
              // Check driver login status from history for today only
              const historyResponse = await feathersClient.service('history').find({
                query: {
                  entityId: driver._id,
                  entityType: 'driver',
                  historyType: 'availability',
                  $limit: 1,
                  $sort: { createdAt: -1 }
                }
              })
              
              const history = Array.isArray(historyResponse.data) ? historyResponse.data : [historyResponse]
              if (history.length > 0 && history[0]) {
                const lastStatus = history[0].status || 'unknown'
                driverLoginStatus = lastStatus === 'available' ? 'logged-in' : 'not-logged-in'
              } else {
                driverLoginStatus = 'not-logged-in'
              }
            } else {
              // For future dates, don't show login status
              driverLoginStatus = 'scheduled'
            }
          } catch (error) {
            console.error(`Error loading driver ${effectiveDriverId}:`, error)
            driverLoginStatus = 'unknown'
          }
        }
        
        // Calculate note count for this route
        let noteCount = 0
        if (routeExecution && routeExecution.stops) {
          noteCount = routeExecution.stops.filter((stop: any) => 
            stop.notes && stop.notes.trim() !== ''
          ).length
        }

        const routeWithDriver = {
          id: route._id,
          trkid: route.trkid,
          truckNumber: effectiveTruckNumber,
          truckIsSubstitute,
          departureTime: route.departureTime,
          totalStops: route.totalStops || 0,
          estimatedDuration: route.estimatedDuration || 0,
          driver: driverInfo,
          driverName: driverInfo?.name,
          driverIsSubstitute: effectiveDriverId !== route.defaultDriverId,
          driverLoginStatus,
          status: getRouteStatus(route, driverLoginStatus, routeExecution),
          routeExecution,
          noteCount,
          needsAttention: routeExecution?.status !== 'cancelled' && (driverLoginStatus === 'not-logged-in' || driverLoginStatus === 'unassigned'),
          progressPercent: 0, // TODO: Calculate from actual progress
          progressText: 'Ready to Start',
          eta: 'Calculating...',
          defaultDriverId: route.defaultDriverId
        }
        
        
        routesWithDrivers.push(routeWithDriver)
      }

      activeRoutesList.value = routesWithDrivers
      
      // Get real-time Geotab tracking data for routes with vehicles
      await updateRouteProgressFromGeotab(routesWithDrivers)
      
      // Update alerts based on route data (skip cancelled routes and past dates)
      const alerts = []
      
      // Check if selected date is today for actionable alerts
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const selectedDateOnly = new Date(selectedDate.value)
      selectedDateOnly.setHours(0, 0, 0, 0)
      const isToday = selectedDateOnly.getTime() === today.getTime()
      const isFutureDate = selectedDateOnly.getTime() > today.getTime()
      
      routesWithDrivers.forEach(route => {
        // Skip alerts for cancelled routes - they don't need attention
        if (route.status === 'Cancelled') {
          return
        }
        
        // Only show driver assignment alerts for today or future dates
        if (!route.driver && (isToday || isFutureDate)) {
          alerts.push({
            id: `route-${route.id}`,
            type: 'route',
            title: 'Route Needs Driver Assignment',
            description: `${route.trkid} - No driver assigned`,
            actionText: 'Assign Driver',
            routeId: route.id,
            defaultDriverId: route.defaultDriverId
          })
        } else if (route.driverLoginStatus === 'not-logged-in' && isToday) {
          alerts.push({
            id: `driver-${route.driver.id}`,
            type: 'driver', 
            title: 'Driver Not Logged In',
            description: `${route.driver.name} on ${route.trkid} - Not logged in`,
            actionText: 'Contact Driver'
          })
        }
      })

      // Check for stop-level alerts (notes marked for attention, skipped stops)
      for (const route of routesWithDrivers) {
        if (route.status === 'Cancelled') continue
        
        try {
          // Get route execution data to check for stop alerts
          const dateStr = selectedDate.value.toISOString().split('T')[0]
          const executionResponse = await feathersClient.service('route-executions').find({
            query: {
              routeId: route.id,
              executionDate: dateStr,
              $limit: 1
            }
          })
          
          const executions = Array.isArray(executionResponse) ? executionResponse : executionResponse.data || []
          if (executions.length > 0 && executions[0].stops) {
            const stopAlerts = executions[0].stops.filter((stop: any) => 
              stop.showInAttention && (stop.notes || stop.status === 'skipped')
            )
            
            stopAlerts.forEach((stop: any) => {
              alerts.push({
                id: `stop-${route.id}-${stop.stopId}`,
                type: stop.status === 'skipped' ? 'warning' : 'info',
                title: stop.status === 'skipped' ? 'Stop Skipped' : 'Stop Note',
                description: `${route.trkid} - Stop ${stop.sequence}: ${stop.notes || 'Skipped stop'}`,
                actionText: 'View Route'
              })
            })
          }
        } catch (error) {
          console.error(`Error checking stop alerts for route ${route.trkid}:`, error)
        }
      }
      criticalAlerts.value = alerts

    } catch (error) {
      console.error('Error loading route data:', error)
      activeRoutesList.value = []
    } finally {
      loadingRoutes.value = false
    }
  }

  // Quick actions
  const quickActions = computed(() => [
    { title: 'Driver Management', icon: 'mdi-account-hard-hat', action: () => navigateTo('/drivers') },
    { title: 'Route Details', icon: 'mdi-map-marker-path', action: () => navigateTo('/routes') },
    { title: 'Terminal Operations', icon: 'mdi-office-building', action: () => navigateTo('/terminals') },
    { title: 'Planning Center', icon: 'mdi-calendar-clock', action: () => navigateTo('/planning') },
    { title: 'Generate Report', icon: 'mdi-file-chart', action: () => generateReport() },
    { title: 'GEOtab Tools', icon: 'mdi-map-marker-radius', action: () => navigateTo('/admin/geotab') },
  ])

  // Status color/icon helpers
  const getDriverStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success'
      case 'offline': return 'error'
      case 'break': return 'warning'
      default: return 'grey'
    }
  }

  const getDriverStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return 'mdi-check'
      case 'offline': return 'mdi-close'
      case 'break': return 'mdi-pause'
      default: return 'mdi-help'
    }
  }

  const getRouteStatusColor = (status: string) => {
    switch (status) {
      case 'Cancelled': return 'error'
      case 'Completed': return 'success'
      case 'In Progress': return 'primary'
      case 'Active': return 'success'
      case 'Exception': return 'error'
      case 'On Time': return 'success'
      case 'Delayed': return 'warning'
      case 'Driver Offline': return 'warning'
      case 'Needs Assignment': return 'warning'
      case 'Scheduled': return 'info'
      case 'Pending': return 'info'
      case 'No Geotab Data': return 'grey'
      default: return 'grey'
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'driver': return 'error'
      case 'route': return 'warning'
      case 'schedule': return 'info'
      default: return 'grey'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'driver': return 'mdi-account-alert'
      case 'route': return 'mdi-map-marker-alert'
      case 'schedule': return 'mdi-calendar-alert'
      default: return 'mdi-alert'
    }
  }

  const getAlertClass = (type: string) => {
    switch (type) {
      case 'driver': return 'bg-red-lighten-5'
      case 'route': return 'bg-orange-lighten-5'
      case 'schedule': return 'bg-blue-lighten-5'
      default: return 'bg-grey-lighten-4'
    }
  }

  // Route-specific helper functions
  const getRouteStatus = (route: any, driverLoginStatus: string, routeExecution?: any) => {
    // Check for cancelled status first
    if (routeExecution?.status === 'cancelled') {
      return 'Cancelled'
    }
    
    // For past dates, check if we have Geotab data
    const isPastDate = selectedDate.value < new Date(new Date().setHours(0, 0, 0, 0))
    if (isPastDate) {
      // Check if route execution exists and has stop data
      if (!routeExecution || !routeExecution.stops || routeExecution.stops.length === 0) {
        return 'No Geotab Data'
      }
      
      // Check if the last stop has actual arrival time (ATA)
      const lastStop = routeExecution.stops[routeExecution.stops.length - 1]
      if (lastStop && lastStop.actualArrivalTime) {
        return 'Completed'
      } else {
        return 'No Geotab Data'
      }
    }
    
    // Check for other execution statuses (for current/future dates)
    if (routeExecution?.status === 'in-progress') {
      return 'In Progress'
    }
    if (routeExecution?.status === 'completed') {
      return 'Completed'
    }
    if (routeExecution?.status === 'exception') {
      return 'Exception'
    }
    
    // Default status logic based on driver assignment
    if (!route.defaultDriverId) return 'Needs Assignment'
    if (driverLoginStatus === 'not-logged-in') return 'Driver Offline'
    if (driverLoginStatus === 'logged-in') return 'Active'
    if (driverLoginStatus === 'scheduled') return 'Scheduled'
    return 'Unknown'
  }

  const getDriverLoginStatusColor = (status: string) => {
    switch (status) {
      case 'logged-in': return 'success'
      case 'not-logged-in': return 'error'
      case 'scheduled': return 'primary'
      case 'unassigned': return 'grey'
      default: return 'warning'
    }
  }

  const getDriverLoginStatusIcon = (status: string) => {
    switch (status) {
      case 'logged-in': return 'mdi-check'
      case 'not-logged-in': return 'mdi-close'
      case 'scheduled': return 'mdi-calendar-check'
      case 'unassigned': return 'mdi-account-question'
      default: return 'mdi-help'
    }
  }

  const getDriverLoginStatusText = (status: string) => {
    switch (status) {
      case 'logged-in': return 'Logged In'
      case 'not-logged-in': return 'Not Logged In'
      case 'scheduled': return 'Scheduled'
      case 'unassigned': return 'Unassigned'
      default: return 'Unknown Status'
    }
  }

  // Stop status helper functions
  const getStopStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'in-progress': return 'primary'
      case 'skipped': return 'error'
      case 'pending': return 'info'
      case 'active': return 'primary'
      default: return 'grey'
    }
  }

  const getStopStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed'
      case 'in-progress': return 'In Progress'
      case 'skipped': return 'Skipped'
      case 'pending': return 'Pending'
      case 'active': return 'Active'
      default: return 'Unknown'
    }
  }

  const getRouteProgressColor = (route: any) => {
    if (route.needsAttention) return 'error'
    if (route.status === 'Active') return 'success'
    return 'info'
  }

  // Geotab integration for route tracking (real-time or historical)
  const updateRouteProgressFromGeotab = async (routes: any[]) => {
    try {
      // Filter routes that have truck numbers (needed for Geotab tracking)
      const trackableRoutes = routes.filter(route => route.truckNumber && route.driver)
      
      if (trackableRoutes.length === 0) {
        return
      }

      // Get Geotab authentication status first
      const authStatus = await feathersClient.service('geotab').getMemoryAuthStatus()
      if (!authStatus.isAuthenticated) {
        console.warn('[GEOTAB] Not authenticated - skipping route tracking')
        return
      }

      const trackingType = isHistoricalDate.value ? 'historical' : 'real-time'

      // Prepare route data for batch Geotab call
      const geotabRoutes = trackableRoutes.map(route => ({
        routeId: route.id,
        truckNumber: route.truckNumber,
        driverGeotabId: route.driver?.geotab // assuming driver has geotab field
      }))

      if (isHistoricalDate.value) {
        // For historical dates, get trip data from Geotab
        const selectedDateString = selectedDate.value.toISOString().split('T')[0]
        const tripData = await feathersClient.service('geotab').getTripData({
          fromDate: `${selectedDateString}T00:00:00.000Z`,
          toDate: `${selectedDateString}T23:59:59.999Z`,
          authData: {
            database: authStatus.database,
            username: authStatus.username, 
            password: 'from_memory'
          }
        })

        if (tripData.trips && tripData.trips.length > 0) {
          // Process historical trip data for each route
          trackableRoutes.forEach(route => {
            const routeTrips = tripData.trips.filter((trip: any) => 
              trip.deviceInfo?.truckID === route.truckNumber ||
              trip.deviceName === route.truckNumber
            )
            
            if (routeTrips.length > 0) {
              const totalDistance = routeTrips.reduce((sum: number, trip: any) => sum + (trip.distance || 0), 0)
              const completedTrips = routeTrips.filter((trip: any) => trip.stop).length
              
              route.status = completedTrips > 0 ? 'Completed' : 'Executed'
              route.progressPercent = 100 // Historical routes are complete
              route.progressText = `${totalDistance.toFixed(1)} miles completed`
              route.eta = 'Historical Data'
              route.historicalTrips = routeTrips.length
            } else {
              route.status = 'No Data'
              route.progressText = 'No trip data found'
              route.eta = 'N/A'
            }
          })
        }
      } else {
        // For current/future dates, get real-time fleet status
        const fleetStatus = await feathersClient.service('geotab').getFleetRouteStatus({
          routes: geotabRoutes,
          authData: {
            database: authStatus.database,
            username: authStatus.username, 
            password: 'from_memory'
          }
        })

        if (!fleetStatus.success || !fleetStatus.routeStatuses) {
          console.warn('[GEOTAB] Failed to get fleet route status:', fleetStatus.error)
          return
        }

        // Update route data with real-time Geotab information
        fleetStatus.routeStatuses.forEach((geotabStatus: any) => {
          const route = routes.find(r => r.id === geotabStatus.routeId)
          if (route) {
            // Update route status based on Geotab data
            if (geotabStatus.status === 'active') {
              route.status = 'In Progress'
              route.progressPercent = calculateProgressPercent(geotabStatus)
              route.progressText = `Moving - ${geotabStatus.speed || 0} mph`
              route.eta = calculateETA(route, geotabStatus)
            } else if (geotabStatus.status === 'idle') {
              route.status = 'Idle'
              route.progressPercent = calculateProgressPercent(geotabStatus)
              route.progressText = 'Stopped'
              route.eta = calculateETA(route, geotabStatus)
            } else if (geotabStatus.status === 'offline') {
              route.status = 'Offline'
              route.progressText = 'No GPS Signal'
            }
          }
        })
      }

      const dataType = isHistoricalDate.value ? 'historical trip data' : 'real-time data'

    } catch (error) {
      console.error('[GEOTAB] Error updating route progress:', error)
      // Don't throw - continue with basic route data if Geotab fails
    }
  }

  // Calculate route progress percentage based on time and distance
  const calculateProgressPercent = (geotabStatus: any) => {
    // Simple time-based estimation - could be enhanced with actual route data
    const startOfDay = new Date()
    startOfDay.setHours(6, 0, 0, 0) // Assume routes start around 6 AM
    const endOfDay = new Date()
    endOfDay.setHours(18, 0, 0, 0) // Assume routes end around 6 PM
    
    const now = new Date()
    const dayDuration = endOfDay.getTime() - startOfDay.getTime()
    const elapsed = now.getTime() - startOfDay.getTime()
    
    if (elapsed < 0) return 0
    if (elapsed > dayDuration) return 100
    
    const timeProgress = (elapsed / dayDuration) * 100
    
    // Adjust based on whether vehicle is moving
    if (geotabStatus.status === 'active' && geotabStatus.speed > 10) {
      return Math.min(100, timeProgress * 1.2) // Boost progress if actively moving
    } else if (geotabStatus.status === 'idle') {
      return Math.max(0, timeProgress * 0.8) // Reduce progress if idle too long
    }
    
    return Math.round(timeProgress)
  }

  // Calculate estimated time of arrival
  const calculateETA = (route: any, geotabStatus: any) => {
    try {
      const now = new Date()
      
      // Simple ETA calculation based on estimated duration
      if (route.estimatedDuration && route.estimatedDuration > 0) {
        const estimatedEndTime = new Date()
        estimatedEndTime.setHours(6, 0, 0, 0) // Start time
        estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + route.estimatedDuration)
        
        if (geotabStatus.status === 'active' && geotabStatus.speed > 5) {
          // If actively moving, use normal ETA
          return estimatedEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        } else if (geotabStatus.status === 'idle') {
          // If idle, add delay
          estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + 30)
          return `${estimatedEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Delayed)`
        }
      }
      
      // Default fallback
      const defaultETA = new Date()
      defaultETA.setHours(17, 0, 0, 0) // Default to 5 PM
      return defaultETA.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      
    } catch (error) {
      console.error('Error calculating ETA:', error)
      return 'Calculating...'
    }
  }

  // Terminal management methods
  const loadTerminals = async () => {
    loadingTerminals.value = true
    try {
      const response = await feathersClient.service('terminals').find({
        query: {
          $sort: { name: 1 }, // Sort by terminal name
          $limit: 1000 // Get all terminals
        }
      })
      
      // Transform terminals data to match our interface
      const terminals: Terminal[] = Array.isArray(response) ? response : response.data || []
      terminalOptions.value = terminals.map(terminal => ({
        id: terminal._id,
        name: terminal.name,
        location: terminal.city && terminal.state ? `${terminal.city}, ${terminal.state}` : (terminal.agent || 'Unknown Location'),
        city: terminal.city,
        state: terminal.state,
        agent: terminal.agent,
        cName: terminal.cName,
        streetAddress: terminal.streetAddress,
        timeZone: terminal.timeZone,
        leaders: terminal.leaders,
        ...terminal // Include all other fields
      }))
      
    } catch (error) {
      console.error('Error loading terminals:', error)
      terminalOptions.value = []
    } finally {
      loadingTerminals.value = false
    }
  }

  const loadUserPreferences = async () => {
    try {
      // Load from user profile database
      if (authStore.user) {
        homeTerminalId.value = authStore.user.homeTerminalId || null
        favoriteTerminalIds.value = authStore.user.favoriteTerminalIds || []
        
        // Validate that home terminal exists in loaded terminals
        if (homeTerminalId.value && !selectedTerminalId.value) {
          const terminalExists = terminalOptions.value.some(t => t.id === homeTerminalId.value)
          if (terminalExists) {
            selectedTerminalId.value = homeTerminalId.value
          } else {
            console.warn('Home terminal not found in available terminals, clearing preference')
            homeTerminalId.value = null
            await saveUserPreferences()
          }
        }
        
        // Filter favorite terminal IDs to only include valid terminals
        const validFavorites = favoriteTerminalIds.value.filter(id => 
          terminalOptions.value.some(t => t.id === id)
        )
        if (validFavorites.length !== favoriteTerminalIds.value.length) {
          favoriteTerminalIds.value = validFavorites
          await saveUserPreferences()
        }
      }
    } catch (error) {
      console.error('Error loading user preferences:', error)
    }
  }

  const saveUserPreferences = async () => {
    try {
      if (authStore.user) {
        // Update user profile in database
        await feathersClient.service('users').patch(authStore.user._id, {
          homeTerminalId: homeTerminalId.value,
          favoriteTerminalIds: favoriteTerminalIds.value
        })
        
        // Update local auth store to reflect changes
        await authStore.reAuthenticate()
        
      }
    } catch (error) {
      console.error('Error saving user preferences:', error)
    }
  }

  const selectTerminal = (terminalId: string) => {
    selectedTerminalId.value = terminalId
    showTerminalListDialog.value = false
    loadTerminalData()
  }

  const onTerminalChange = () => {
    if (selectedTerminalId.value) {
      updateUrlWithParams(selectedTerminalId.value)
      loadTerminalData()
    }
  }

  const setHomeTerminal = async () => {
    if (!pendingHomeTerminalId.value || !authStore.user) return
    
    savingHomeTerminal.value = true
    try {
      // Update user profile in database with new home terminal
      await feathersClient.service('users').patch(authStore.user._id, {
        homeTerminalId: pendingHomeTerminalId.value
      })
      
      // Update local state
      homeTerminalId.value = pendingHomeTerminalId.value
      selectedTerminalId.value = pendingHomeTerminalId.value
      
      // Refresh auth store to reflect the database changes
      await authStore.reAuthenticate()
      
      showSetHomeTerminalDialog.value = false
      pendingHomeTerminalId.value = null
      loadTerminalData()
      
    } catch (error) {
      console.error('Error setting home terminal:', error)
    } finally {
      savingHomeTerminal.value = false
    }
  }

  const isFavoriteTerminal = (terminalId: string) => {
    return favoriteTerminalIds.value.includes(terminalId)
  }

  const toggleFavoriteTerminal = async (terminalId: string) => {
    if (!authStore.user) return
    
    try {
      const index = favoriteTerminalIds.value.indexOf(terminalId)
      if (index > -1) {
        favoriteTerminalIds.value.splice(index, 1)
      } else {
        favoriteTerminalIds.value.push(terminalId)
      }
      
      // Update user profile in database
      await feathersClient.service('users').patch(authStore.user._id, {
        favoriteTerminalIds: favoriteTerminalIds.value
      })
      
      // Refresh auth store to reflect the database changes
      await authStore.reAuthenticate()
      
    } catch (error) {
      console.error('Error updating favorite terminals:', error)
      // Revert the change if database update failed
      const index = favoriteTerminalIds.value.indexOf(terminalId)
      if (index > -1) {
        favoriteTerminalIds.value.splice(index, 1)
      } else {
        favoriteTerminalIds.value.push(terminalId)
      }
    }
  }

  const loadTerminalData = async () => {
    if (!selectedTerminalId.value) return
    
    // Ensure available drivers are loaded before refreshing route data
    await loadAvailableDrivers()
    
    await refreshRouteData()
    lastUpdateTime.value = new Date().toLocaleTimeString()
  }

  // Action methods
  const refreshDriverStatus = async () => {
    await refreshRouteData()
  }

  const refreshSchedule = async () => {
    loadingSchedule.value = true
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Error refreshing schedule:', error)
    } finally {
      loadingSchedule.value = false
    }
  }

  const contactDriver = (route: any) => {
    // TODO: Implement driver communication (SMS, phone call, app notification)
  }

  const viewRouteLocation = (route: any) => {
    // TODO: Implement route location viewing (map integration)
  }

  const importGeotabData = async (route: any) => {
    try {
      // Show loading state for this specific route
      const routeIndex = activeRoutesList.value.findIndex(r => r.id === route.id)
      if (routeIndex !== -1) {
        activeRoutesList.value[routeIndex].importingGeotab = true
      }

      const dateStr = selectedDate.value.toISOString().split('T')[0]
      
      // Call the Geotab service to import historical data for this route
      const result = await feathersClient.service('geotab').importRouteData({
        routeId: route.id,
        routeTrkid: route.trkid,
        executionDate: dateStr,
        terminalId: selectedTerminalId.value,
        truckNumber: route.truckNumber,
        driverId: route.driver?._id || route.driver?.id
      })

      if (result.success) {
        showSuccess('Geotab Import', `Successfully imported data for route ${route.trkid}`)
        // Refresh the route data to show the imported information
        await refreshRouteData()
      } else {
        showError('Geotab Import Failed', result.error || 'Could not import route data from Geotab')
      }
    } catch (error: any) {
      console.error('Error importing Geotab data:', error)
      showError('Geotab Import Error', error.message || 'Failed to import route data')
    } finally {
      // Clear loading state
      const routeIndex = activeRoutesList.value.findIndex(r => r.id === route.id)
      if (routeIndex !== -1) {
        activeRoutesList.value[routeIndex].importingGeotab = false
      }
    }
  }


  // Route details dialog methods
  const loadRouteDetails = async (routeId: string) => {
    try {
      loadingRouteDetails.value = true
      selectedRouteDetails.value = null
      selectedRouteStops.value = []
      selectedRouteDriver.value = null
      selectedRouteReplacement.value = null


      // Load route details (backend hook will populate stops, estimatedDuration, estimatedDistance)
      const route = await feathersClient.service('routes').get(routeId)
      
      if (!route) {
        console.error('Route not found:', routeId)
        return
      }

      selectedRouteDetails.value = route
      
      // Use backend-populated stops if available
      let routeStops = []
      if (route.stops && Array.isArray(route.stops)) {
        routeStops = route.stops.sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
      }

      // Check for route-specific driver assignment for this date first
      const dateStr = selectedDate.value.toISOString().split('T')[0]
      let effectiveDriverId = route.defaultDriverId
      let isSubstitute = false
      let routeExecution = null
      
      try {
        const executionResponse = await feathersClient.service('route-executions').find({
          query: {
            routeId: route._id,
            executionDate: dateStr,
            $limit: 1
          }
        })
        
        const executions = Array.isArray(executionResponse) ? executionResponse : executionResponse.data || []
        if (executions.length > 0) {
          routeExecution = executions[0]
          
          // Route-execution exists, so use its driver assignment (even if undefined/null)
          if (routeExecution.assignedDriverId) {
            effectiveDriverId = routeExecution.assignedDriverId
            isSubstitute = effectiveDriverId !== route.defaultDriverId
          } else {
            // Route-execution exists but has no driver assigned (driver was removed)
            effectiveDriverId = null
            isSubstitute = false
          }
        }
      } catch (error) {
        console.error('[ROUTE-DETAILS] Error checking for route execution:', error)
      }

      // Merge route stops with execution data (notes, status, etc.)
      if (routeExecution && routeExecution.stops && Array.isArray(routeExecution.stops)) {
        // Merge execution stop data into route stops
        routeStops = routeStops.map(routeStop => {
          const executionStop = routeExecution.stops.find((es: any) => es.stopId === routeStop._id)
          if (executionStop) {
            return {
              ...routeStop,
              status: executionStop.status || 'pending',
              notes: executionStop.notes || '',
              showInAttention: executionStop.showInAttention || false,
              skipReason: executionStop.skipReason
            }
          }
          return {
            ...routeStop,
            status: 'pending',
            notes: '',
            showInAttention: false
          }
        })
      } else {
        // No execution data - default all stops to pending
        routeStops = routeStops.map(routeStop => ({
          ...routeStop,
          status: 'pending',
          notes: '',
          showInAttention: false
        }))
      }
      
      selectedRouteStops.value = routeStops

      // Load the effective driver (either from route-execution or default)
      if (effectiveDriverId) {
        try {
          const driver = await feathersClient.service('drivers').get(effectiveDriverId)
          selectedRouteDriver.value = driver
          selectedRouteDriverIsSubstitute.value = isSubstitute
        } catch (error) {
          console.error(`Error loading driver ${effectiveDriverId}:`, error)
          selectedRouteDriver.value = null
          selectedRouteDriverIsSubstitute.value = false
        }
      } else {
        selectedRouteDriverIsSubstitute.value = false
      }

      // Check for replacement assignments for the selected date
      await loadReplacementAssignments(routeId, selectedDate.value)

      
      // Show the dialog
      showRouteDetailsDialog.value = true

    } catch (error) {
      console.error('Error loading route details:', error)
    } finally {
      loadingRouteDetails.value = false
    }
  }

  // Helper methods for route details dialog
  const convertFloatToTime = (timeValue: any): string => {
    if (!timeValue && timeValue !== 0) return ''

    try {
      if (typeof timeValue === 'string') {
        if (timeValue.includes(':')) return timeValue
        const floatValue = Number.parseFloat(timeValue)
        if (isNaN(floatValue)) return timeValue
        timeValue = floatValue
      }

      if (typeof timeValue === 'number') {
        const hours = Math.floor(timeValue)
        const minutes = Math.round((timeValue - hours) * 60)

        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return timeValue.toString()
        }

        const formattedHours = hours.toString().padStart(2, '0')
        const formattedMinutes = minutes.toString().padStart(2, '0')
        return `${formattedHours}:${formattedMinutes}`
      }

      return timeValue.toString()
    } catch {
      return timeValue?.toString() || ''
    }
  }

  const formatDistance = (distance: number): string => {
    if (distance === 0) return 'N/A'
    return distance.toFixed(1)
  }

  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const loadReplacementAssignments = async (routeId: string, date: Date) => {
    try {
      // Check if there are replacement assignments for this route on this date
      // This would typically query a dispatched-routes or route-executions table
      const executionDate = date.toISOString().split('T')[0] // YYYY-MM-DD format
      
      
      // TODO: Query actual replacement data from dispatched-routes or route-executions
      // In a real implementation, this would query the database:
      // const dispatchedRoutes = await feathersClient.service('dispatched-routes').find({
      //   query: {
      //     routeId,
      //     executionDate,
      //     $limit: 1
      //   }
      // })
      
      // For now, set to null (no replacements)
      selectedRouteReplacement.value = null
      
    } catch (error) {
      console.error('Error loading replacement assignments:', error)
      selectedRouteReplacement.value = null
    }
  }

  const editDriverAssignment = async () => {
    const route = selectedRouteDetails.value
    if (!route) return

    // Enter inline editing mode
    editingDriverAssignment.value = true
    selectedReplacementDriverId.value = null
    
    // Load available drivers
    await loadAvailableDrivers()
  }

  const editTruckAssignment = async () => {
    const route = selectedRouteDetails.value
    if (!route) return

    const dateStr = selectedDate.value.toISOString().split('T')[0]
    
    // Start inline editing mode
    editingTruckAssignment.value = true
    selectedReplacementTruckNumber.value = null
    
    // Load available trucks for selection
    await loadAvailableTrucks()
    // Dialog title: "Edit Truck Assignment - Route [trkid]"
    // Dialog content should offer two options:
    //
    // Option 1: "Assign truck for [date] only"
    //   - Creates/updates dispatched-route or route-execution record
    //   - Message: "This assignment will apply only to the selected date"
    //
    // Option 2: "Update default truck for this route"
    //   - Updates route.truckNumber and route.subUnitNumber in routes service  
    //   - Message: "This will change the default truck for all future executions"
    //
    // Current context: Shows current default truck and any existing date-specific override
  }

  const editEquipmentAssignment = () => {
    const route = selectedRouteDetails.value
    if (!route) return

    const dateStr = selectedDate.value.toISOString().split('T')[0]
    
    alert(`Edit Equipment Assignment - Route ${route.trkid} for ${dateStr}\n\nThis will open a dialog with options to:\n1. Assign equipment for this date only\n2. Update the route plan default equipment\n\n(Dialog implementation pending)`)
    
    // TODO: Show equipment assignment dialog with dual-context options
    // Dialog title: "Edit Equipment Assignment - Route [trkid]"
    // Dialog content should offer two options:
    //
    // Option 1: "Assign equipment for [date] only"
    //   - Creates/updates dispatched-route or route-execution record
    //   - Message: "This assignment will apply only to the selected date"
    //
    // Option 2: "Update default equipment for this route"
    //   - Updates route.scanner and route.fuelCard in routes service
    //   - Message: "This will change the default equipment for all future executions"
    //
    // Current context: Shows current default equipment and any existing date-specific overrides
  }

  const openDriverDetails = () => {
    const driver = selectedRouteDriver.value || selectedRouteReplacement.value?.driver
    if (!driver) return

    // Use driver number or ID for navigation - assuming driver number is available
    const driverNumber = driver.driverId || driver.employeeNo || driver._id
    
    
    // Open in new tab/window
    const driverUrl = `/drivers/${driverNumber}`
    window.open(driverUrl, '_blank')
  }

  const openTruckDetails = () => {
    const truckNumber = selectedRouteDetails.value?.truckNumber || selectedRouteReplacement.value?.truck?.number
    if (!truckNumber) return

    
    // Open in new tab/window  
    const truckUrl = `/trucks/${truckNumber}`
    window.open(truckUrl, '_blank')
  }

  const viewFullRouteDetails = () => {
    if (selectedRouteDetails.value?.trkid) {
      // Convert route trkid to URL-safe format (replace dots with dashes)
      const urlSafeRouteName = selectedRouteDetails.value.trkid.replace(/\./g, '-')
      showRouteDetailsDialog.value = false
      navigateTo(`/routes/${urlSafeRouteName}`)
    }
  }

  const openRouteDetails = (route: any) => {
    loadRouteDetails(route.id)
  }

  const openGEOtabLink = (driver: any) => {
    // TODO: Generate deep link to GEOtab
    window.open('https://my.geotab.com', '_blank')
  }

  const handleAlert = (alert: any) => {
    
    // For stop alerts, extract the route ID and open route details dialog
    if (alert.id && alert.id.startsWith('stop-')) {
      // Alert ID format: "stop-{routeId}-{stopId}"
      const parts = alert.id.split('-')
      if (parts.length >= 2) {
        const routeId = parts[1]
        
        // Find the route in the active routes list
        const route = activeRoutesList.value.find(r => r.id === routeId)
        if (route) {
          openRouteDetails(route)
        } else {
          console.warn('Route not found for ID:', routeId)
        }
      }
    } else {
    }
  }

  const openCommunications = () => {
    // TODO: Implement communication center
  }

  const sendBroadcast = async () => {
    if (!broadcastMessage.value.trim()) return
    
    sendingBroadcast.value = true
    try {
      // TODO: Implement broadcast messaging
      await new Promise(resolve => setTimeout(resolve, 1000))
      showBroadcastDialog.value = false
      broadcastMessage.value = ''
      broadcastRecipients.value = []
    } catch (error) {
      console.error('Error sending broadcast:', error)
    } finally {
      sendingBroadcast.value = false
    }
  }

  const generateReport = () => {
    // TODO: Implement report generation
  }

  const navigateTo = (path: string) => {
    useRouter().push(path)
  }

  // Watch for URL changes (browser back/forward navigation)
  watch(() => route.query.date, (newDate: string | undefined) => {
    if (newDate) {
      const parsedDate = new Date(newDate + 'T12:00:00')
      if (!isNaN(parsedDate.getTime())) {
        // Only update if the date actually changed to avoid infinite loops
        const currentDateString = selectedDate.value.toISOString().split('T')[0]
        if (newDate !== currentDateString) {
          selectedDate.value = parsedDate
          onDateChanged()
        }
      }
    } else {
      // If date is removed from URL, default to today
      const today = new Date()
      selectedDate.value = today
      onDateChanged()
    }
  })

  watch(() => route.query.terminal, (newTerminalName: string | undefined) => {
    if (newTerminalName && terminalOptions.value.length > 0) {
      // Convert URL terminal name to terminal ID
      const terminalId = getTerminalObjectId(terminalOptions.value, newTerminalName)
      if (terminalId && terminalId !== selectedTerminalId.value) {
        selectedTerminalId.value = terminalId
        loadTerminalData()
      } else if (!terminalId) {
        console.warn('[OPERATIONS] Terminal not found for URL name:', newTerminalName)
      }
    } else if (!newTerminalName && selectedTerminalId.value) {
      // If terminal is removed from URL, clear selection
      selectedTerminalId.value = null
    }
  })

  // Initialize data on component mount
  // Route cancellation functions
  const closeCancelRoutesDialog = () => {
    showCancelRoutesDialog.value = false
    cancellationReason.value = ''
    cancellationNotes.value = ''
    cancellingRoutes.value = false
  }

  const confirmCancelRoutes = async () => {
    if (!cancellationReason.value) {
      showError('Validation Error', 'Please select a cancellation reason.')
      return
    }

    try {
      cancellingRoutes.value = true
      
      // Get all active routes for the selected date
      const routesToCancel = activeRoutesList.value
      if (routesToCancel.length === 0) {
        showError('No Routes', 'No active routes found for the selected date.')
        return
      }

      const dateStr = selectedDate.value.toISOString().split('T')[0]
      
      // Cancel each route by updating its status
      const promises = routesToCancel.map(async (route) => {
        try {
          // Check if route-execution exists for this route and date
          const executionResponse = await feathersClient.service('route-executions').find({
            query: {
              routeId: route._id,
              executionDate: dateStr,
              $limit: 1
            }
          })
          
          const executions = Array.isArray(executionResponse) ? executionResponse : executionResponse.data || []
          
          if (executions.length > 0) {
            // Update existing route-execution
            await feathersClient.service('route-executions').patch(executions[0]._id, {
              status: 'cancelled',
              cancellationReason: cancellationReason.value,
              cancellationNotes: cancellationNotes.value || null,
              updatedAt: new Date().toISOString()
            })
          } else {
            // Create new route-execution with cancelled status
            await feathersClient.service('route-executions').create({
              routeId: route._id || route.id,
              executionDate: dateStr,
              terminalId: selectedTerminalId.value,
              status: 'cancelled',
              cancellationReason: cancellationReason.value,
              cancellationNotes: cancellationNotes.value || null
            })
          }
        } catch (error) {
          console.error(`Error cancelling route ${route.trkid}:`, error)
          throw error
        }
      })

      await Promise.all(promises)
      
      // Show success and refresh data
      closeCancelRoutesDialog()
      
      // Refresh the route data to show updated status
      await refreshRouteData()
      
    } catch (error) {
      console.error('Error cancelling routes:', error)
      showError('Cancellation Failed', 'Failed to cancel routes. Please try again.')
    } finally {
      cancellingRoutes.value = false
    }
  }

  // Stop editing functions
  const editStopNote = (stop: any) => {
    selectedStop.value = stop
    editingStopNote.value = stop.notes || ''
    showNoteInAttention.value = stop.showInAttention || false
    showEditStopNoteDialog.value = true
  }

  const closeEditStopNoteDialog = () => {
    showEditStopNoteDialog.value = false
    selectedStop.value = null
    editingStopNote.value = ''
    showNoteInAttention.value = false
    savingStopNote.value = false
  }

  const saveStopNote = async () => {
    if (!selectedStop.value || !selectedRouteDetails.value) return
    
    try {
      savingStopNote.value = true
      
      const dateStr = selectedDate.value.toISOString().split('T')[0]
      
      // Check if route-execution exists
      const executionResponse = await feathersClient.service('route-executions').find({
        query: {
          routeId: selectedRouteDetails.value._id,
          executionDate: dateStr,
          $limit: 1
        }
      })
      
      const executions = Array.isArray(executionResponse) ? executionResponse : executionResponse.data || []
      let routeExecution = executions.length > 0 ? executions[0] : null
      
      // Create or update the stop in the route execution
      if (!routeExecution) {
        // Create new route-execution
        routeExecution = await feathersClient.service('route-executions').create({
          routeId: selectedRouteDetails.value._id,
          executionDate: dateStr,
          terminalId: selectedTerminalId.value,
          status: 'scheduled',
          stops: []
        })
      }
      
      // Update the specific stop
      const stops = [...(routeExecution.stops || [])]
      const stopIndex = stops.findIndex(s => s.stopId === selectedStop.value._id)
      
      if (stopIndex >= 0) {
        stops[stopIndex] = {
          ...stops[stopIndex],
          notes: editingStopNote.value,
          showInAttention: showNoteInAttention.value
        }
      } else {
        // Add new stop execution record
        stops.push({
          stopId: selectedStop.value._id,
          sequence: selectedStop.value.sequence,
          status: 'pending',
          notes: editingStopNote.value,
          showInAttention: showNoteInAttention.value
        })
      }
      
      // Update route-execution
      await feathersClient.service('route-executions').patch(routeExecution._id, {
        stops: stops,
        updatedAt: new Date().toISOString()
      })
      
      // Update local data
      selectedStop.value.notes = editingStopNote.value
      selectedStop.value.showInAttention = showNoteInAttention.value
      
      // Store attention flag before closing dialog
      const shouldRefreshForAttention = showNoteInAttention.value
      
      closeEditStopNoteDialog()
      
      // Always refresh route data to update attention panel
      // (notes can be added, removed, or flagged/unflagged for attention)
      await refreshRouteData()
      
    } catch (error) {
      console.error('Error saving stop note:', error)
      showError('Save Failed', 'Failed to save stop note. Please try again.')
    } finally {
      savingStopNote.value = false
    }
  }

  const deleteStopNote = async () => {
    if (!selectedStop.value || !selectedRouteDetails.value) return
    
    try {
      savingStopNote.value = true
      
      const dateStr = selectedDate.value.toISOString().split('T')[0]
      
      // Find the route-execution
      const executionResponse = await feathersClient.service('route-executions').find({
        query: {
          routeId: selectedRouteDetails.value._id,
          executionDate: dateStr,
          $limit: 1
        }
      })
      
      const executions = Array.isArray(executionResponse) ? executionResponse : executionResponse.data || []
      if (executions.length > 0) {
        const routeExecution = executions[0]
        const stops = [...(routeExecution.stops || [])]
        const stopIndex = stops.findIndex(s => s.stopId === selectedStop.value._id)
        
        if (stopIndex >= 0) {
          // Clear the note and attention flag
          stops[stopIndex] = {
            ...stops[stopIndex],
            notes: '',
            showInAttention: false
          }
          
          // If this was the only data for this stop and it's back to default state, remove it
          const stopData = stops[stopIndex]
          if (stopData.status === 'pending' && !stopData.notes && !stopData.showInAttention) {
            stops.splice(stopIndex, 1)
          }
          
          await feathersClient.service('route-executions').patch(routeExecution._id, {
            stops: stops,
            updatedAt: new Date().toISOString()
          })
        }
      }
      
      // Update local data
      selectedStop.value.notes = ''
      selectedStop.value.showInAttention = false
      
      closeEditStopNoteDialog()
      
      // Always refresh to update attention panel
      await refreshRouteData()
      
    } catch (error) {
      console.error('Error deleting stop note:', error)
      showError('Delete Failed', 'Failed to delete stop note. Please try again.')
    } finally {
      savingStopNote.value = false
    }
  }

  const skipStop = (stop: any) => {
    selectedStop.value = stop
    skipStopReason.value = ''
    skipStopNotes.value = ''
    showSkipStopDialog.value = true
  }

  const closeSkipStopDialog = () => {
    showSkipStopDialog.value = false
    selectedStop.value = null
    skipStopReason.value = ''
    skipStopNotes.value = ''
    skippingStop.value = false
  }

  const confirmSkipStop = async () => {
    if (!selectedStop.value || !skipStopReason.value || !selectedRouteDetails.value) return
    
    try {
      skippingStop.value = true
      
      const dateStr = selectedDate.value.toISOString().split('T')[0]
      
      // Check if route-execution exists
      const executionResponse = await feathersClient.service('route-executions').find({
        query: {
          routeId: selectedRouteDetails.value._id,
          executionDate: dateStr,
          $limit: 1
        }
      })
      
      const executions = Array.isArray(executionResponse) ? executionResponse : executionResponse.data || []
      let routeExecution = executions.length > 0 ? executions[0] : null
      
      // Create or update the stop in the route execution
      if (!routeExecution) {
        // Create new route-execution
        routeExecution = await feathersClient.service('route-executions').create({
          routeId: selectedRouteDetails.value._id,
          executionDate: dateStr,
          terminalId: selectedTerminalId.value,
          status: 'scheduled',
          stops: []
        })
      }
      
      // Update the specific stop
      const stops = [...(routeExecution.stops || [])]
      const stopIndex = stops.findIndex(s => s.stopId === selectedStop.value._id)
      
      const skipReason = skipStopNotes.value ? 
        `${skipStopReason.value}: ${skipStopNotes.value}` : 
        skipStopReason.value
      
      if (stopIndex >= 0) {
        stops[stopIndex] = {
          ...stops[stopIndex],
          status: 'skipped',
          skipReason: skipReason,
          notes: skipReason,
          showInAttention: true // Always show skipped stops in attention
        }
      } else {
        // Add new stop execution record
        stops.push({
          stopId: selectedStop.value._id,
          sequence: selectedStop.value.sequence,
          status: 'skipped',
          skipReason: skipReason,
          notes: skipReason,
          showInAttention: true // Always show skipped stops in attention
        })
      }
      
      // Update route-execution
      await feathersClient.service('route-executions').patch(routeExecution._id, {
        stops: stops,
        updatedAt: new Date().toISOString()
      })
      
      // Update local data
      selectedStop.value.status = 'skipped'
      selectedStop.value.notes = skipReason
      selectedStop.value.showInAttention = true
      
      closeSkipStopDialog()
      
      // Refresh route data to update attention panel
      await refreshRouteData()
      
    } catch (error) {
      console.error('Error skipping stop:', error)
      showError('Skip Failed', 'Failed to skip stop. Please try again.')
    } finally {
      skippingStop.value = false
    }
  }

  const restoreStop = async (stop: any) => {
    if (!selectedRouteDetails.value) return
    
    try {
      const dateStr = selectedDate.value.toISOString().split('T')[0]
      
      // Find and update route-execution
      const executionResponse = await feathersClient.service('route-executions').find({
        query: {
          routeId: selectedRouteDetails.value._id,
          executionDate: dateStr,
          $limit: 1
        }
      })
      
      const executions = Array.isArray(executionResponse) ? executionResponse : executionResponse.data || []
      if (executions.length > 0) {
        const routeExecution = executions[0]
        const stops = [...(routeExecution.stops || [])]
        const stopIndex = stops.findIndex(s => s.stopId === stop._id)
        
        if (stopIndex >= 0) {
          stops[stopIndex] = {
            ...stops[stopIndex],
            status: 'pending',
            skipReason: undefined,
            notes: '',
            showInAttention: false
          }
          
          await feathersClient.service('route-executions').patch(routeExecution._id, {
            stops: stops,
            updatedAt: new Date().toISOString()
          })
          
          // Update local data
          stop.status = 'pending'
          stop.notes = ''
          stop.showInAttention = false
          
          // Refresh route data
          await refreshRouteData()
        }
      }
      
    } catch (error) {
      console.error('Error restoring stop:', error)
      showError('Restore Failed', 'Failed to restore stop. Please try again.')
    }
  }

  onMounted(async () => {
    try {
      // Load terminals first
      await loadTerminals()
      
      // Load available drivers for alert dropdowns
      await loadAvailableDrivers()
      
      // Initialize terminal from URL now that terminals are loaded
      const urlTerminalName = route.query.terminal as string
      if (urlTerminalName) {
        const terminalId = getTerminalObjectId(terminalOptions.value, urlTerminalName)
        if (terminalId) {
          selectedTerminalId.value = terminalId
        } else {
          console.warn('[OPERATIONS] Terminal not found for URL name:', urlTerminalName)
        }
      }
      
      // Then load user preferences (which depends on terminals being loaded)
      await loadUserPreferences()
      
      // Set URL parameters if they weren't provided but we have defaults
      if (!route.query.date) {
        updateUrlWithParams(undefined, selectedDate.value)
      }
      
      // If no terminal in URL but we have a selected one, update URL
      if (!route.query.terminal && selectedTerminalId.value) {
        updateUrlWithParams(selectedTerminalId.value, undefined)
      }
      
      // Load terminal data if a terminal is selected
      if (selectedTerminalId.value) {
        loadTerminalData()
      }
    } catch (error) {
      console.error('Error during initialization:', error)
    }
    
    // Set up periodic refresh for real-time route tracking
    // DISABLED: Causing memory leak - periodic polling disabled temporarily
    // setInterval(async () => {
    //   if (selectedTerminalId.value && activeRoutesList.value.length > 0) {
    //     lastUpdateTime.value = new Date().toLocaleTimeString()
    //     
    //     // Update Geotab tracking data without reloading all route data
    //     try {
    //       await updateRouteProgressFromGeotab(activeRoutesList.value)
    //     } catch (error) {
    //       console.error('[OPERATIONS] Error updating route progress:', error)
    //     }
    //   }
    // }, 30000) // Update every 30 seconds
  })
</script>

<style scoped>
.border {
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.rounded {
  border-radius: 4px;
}

.cursor-pointer {
  cursor: pointer;
}

.hover-bg-grey-lighten-4:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>