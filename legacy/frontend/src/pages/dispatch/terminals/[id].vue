<template>
  <div>
    <!-- Loading state -->
    <v-overlay
      v-model="loading"
      class="align-center justify-center"
    >
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
      />
    </v-overlay>

    <!-- Terminal not found -->
    <v-alert
      v-if="!loading && !terminal"
      color="error"
      icon="mdi-alert-circle"
      title="Terminal Not Found"
      type="error"
    >
      The requested terminal could not be found.
      <template #append>
        <v-btn
          color="white"
          variant="outlined"
          @click="router.push('/dispatch')"
        >
          Back to Dispatch
        </v-btn>
      </template>
    </v-alert>

    <!-- Main content -->
    <div v-if="!loading && terminal">
      <!-- Page Controls -->
      <v-row class="mb-6">
        <v-col cols="12">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="d-flex align-center">
              <v-btn
                icon="mdi-arrow-left"
                variant="text"
                @click="router.push('/dispatch')"
              />
              <div class="ml-3">
                <p class="text-body-1 text-grey-darken-1 mb-1">
                  <v-icon class="mr-1" icon="mdi-map-marker" size="small" />
                  {{ terminal.city }}{{ terminal.city && terminal.state ? ', ' : '' }}{{ terminal.state }}
                </p>
                <p class="text-caption text-grey">
                  Last updated: {{ formatTime(lastUpdated) }}
                </p>
              </div>
            </div>
            <div class="d-flex align-center gap-2">
              <v-btn
                color="primary"
                :loading="refreshing"
                variant="outlined"
                @click="refreshData"
              >
                <v-icon>mdi-refresh</v-icon>
              </v-btn>
              <v-chip
                :color="getTerminalStatusColor()"
                variant="elevated"
              >
                {{ getTerminalStatus() }}
              </v-chip>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Status Summary Cards -->
      <v-row class="mb-6">
        <v-col cols="12" md="3">
          <v-card color="red" dark>
            <v-card-text class="text-center py-4">
              <v-icon class="mb-2" icon="mdi-alert-circle" size="36" />
              <h3 class="text-h5">{{ getRouteCountByStatus(['delayed', 'cancelled']) }}</h3>
              <p class="text-body-2">Alerts</p>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="orange" dark>
            <v-card-text class="text-center py-4">
              <v-icon class="mb-2" icon="mdi-truck-fast" size="36" />
              <h3 class="text-h5">{{ getRouteCountByStatus(['dispatched', 'in-transit']) }}</h3>
              <p class="text-body-2">Active</p>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="blue" dark>
            <v-card-text class="text-center py-4">
              <v-icon class="mb-2" icon="mdi-clock-start" size="36" />
              <h3 class="text-h5">{{ getRouteCountByStatus(['planned', 'assigned']) }}</h3>
              <p class="text-body-2">Pending</p>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="green" dark>
            <v-card-text class="text-center py-4">
              <v-icon class="mb-2" icon="mdi-check-circle" size="36" />
              <h3 class="text-h5">{{ getRouteCountByStatus(['completed']) }}</h3>
              <p class="text-body-2">Completed</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Date Navigation -->
      <v-card class="mb-6">
        <v-card-text>
          <v-row align="center" justify="center" class="py-2">
            <v-col cols="auto">
              <v-btn
                icon="mdi-chevron-left"
                variant="text"
                size="large"
                color="primary"
                @click="goToPreviousDay"
              >
                <v-icon>mdi-chevron-left</v-icon>
                <v-tooltip activator="parent" location="top">
                  Previous Day
                </v-tooltip>
              </v-btn>
            </v-col>
            
            <v-col cols="auto" class="text-center">
              <div class="text-h6 font-weight-medium">
                {{ selectedDate.toLocaleDateString('en-US', { weekday: 'long' }) }}
              </div>
              <div class="text-body-1 text-grey">
                {{ selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }}
              </div>
            </v-col>
            
            <v-col cols="auto">
              <v-btn
                icon="mdi-chevron-right"
                variant="text"
                size="large"
                color="primary"
                @click="goToNextDay"
              >
                <v-icon>mdi-chevron-right</v-icon>
                <v-tooltip activator="parent" location="top">
                  Next Day
                </v-tooltip>
              </v-btn>
            </v-col>
            
            <v-col cols="auto" class="ml-4">
              <v-menu v-model="datePickerMenu" :close-on-content-click="false">
                <template #activator="{ props }">
                  <v-btn
                    icon="mdi-calendar"
                    variant="outlined"
                    color="primary"
                    v-bind="props"
                  >
                    <v-icon>mdi-calendar</v-icon>
                    <v-tooltip activator="parent" location="top">
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
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Filters and Controls -->
      <v-row class="mb-4">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="routeSearch"
            clearable
            label="Search routes..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="statusFilter"
            :items="statusFilterOptions"
            label="Status Filter"
            variant="outlined"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="priorityFilter"
            :items="priorityFilterOptions"
            label="Priority Filter"
            variant="outlined"
          />
        </v-col>
        <v-col class="d-flex align-center" cols="12" md="2">
          <v-switch
            v-model="autoRefresh"
            color="primary"
            label="Auto-refresh"
          />
        </v-col>
      </v-row>

      <!-- Routes Cards -->
      <div class="mb-4">
        <div class="d-flex align-center justify-space-between mb-4">
          <div class="d-flex align-center gap-4">
            <h2 class="text-h5">
              <v-icon class="mr-2" icon="mdi-truck-delivery" />
              {{ selectedDateRoutesHeader }} ({{ filteredRoutes.length }})
            </h2>
            
            <!-- View Toggle -->
            <v-btn-toggle
              v-model="viewMode"
              color="primary"
              variant="outlined"
              mandatory
            >
              <v-btn value="per-route" size="small">
                <v-icon class="mr-1">mdi-card-multiple</v-icon>
                Per-Route
              </v-btn>
              <v-btn value="table" size="small">
                <v-icon class="mr-1">mdi-table</v-icon>
                Table
              </v-btn>
            </v-btn-toggle>
          </div>
          
          <div class="d-flex align-center gap-2">
            <v-btn
              :loading="tripDataLoading"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-sync"
              @click="syncWithGeotab"
            >
              GeoTab Sync
            </v-btn>
          </div>
        </div>

        <!-- Per-Route Cards View -->
        <v-row v-if="filteredRoutes.length > 0 && viewMode === 'per-route'">
          <v-col
            v-for="route in filteredRoutes"
            :key="route._id"
            cols="12"
            md="6"
          >
            <v-card
              class="route-card h-100"
            >
              <v-card-title class="d-flex align-center justify-space-between">
                <div class="d-flex align-center">
                  <!-- Three Dot Menu -->
                  <v-menu>
                    <template #activator="{ props }">
                      <v-btn
                        icon="mdi-dots-vertical"
                        size="small"
                        variant="text"
                        v-bind="props"
                        @click.stop
                      />
                    </template>
                    <v-list>
                      <v-list-item @click="markAsCompleted(route)">
                        <v-list-item-title>Mark Completed</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="markAsDelayed(route)">
                        <v-list-item-title>Mark Delayed</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="cancelRoute(route)">
                        <v-list-item-title>Cancel Route</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>

                  <v-icon
                    class="mr-2"
                    :color="getRouteStatusColor(route.status)"
                    :icon="getRouteStatusIcon(route.status)"
                  />
                  <span class="font-weight-bold text-h6 mr-3">{{ getRouteNumber(route.routeId) }}</span>

                  <!-- Driver Info in Title -->
                  <div v-if="getAssignedDriver(route)" class="mr-3">
                    <v-icon class="mr-1" size="small" :color="getTripMatchColor(route, 'driver')">mdi-account</v-icon>
                    <span class="text-body-2" :class="getTripMatchTextClass(route, 'driver')">{{ getDriverName(route) }}</span>
                  </div>
                  <div v-else class="mr-3 text-grey">
                    <v-icon class="mr-1" size="small">mdi-account-outline</v-icon>
                    <span class="text-body-2">No driver</span>
                  </div>

                  <!-- Truck Info in Title -->
                  <div v-if="getAssignedEquipment(route).truck" class="mr-3">
                    <v-icon class="mr-1" size="small" :color="getTripMatchColor(route, 'truck')">mdi-truck</v-icon>
                    <span class="text-body-2" :class="getTripMatchTextClass(route, 'truck')">{{ getTruckInfo(route) }}</span>
                  </div>
                  <div v-else class="mr-3 text-grey">
                    <v-icon class="mr-1" size="small">mdi-truck-outline</v-icon>
                    <span class="text-body-2">No truck</span>
                  </div>

                  <!-- Departure Time -->
                  <div class="d-flex align-center mr-3">
                    <v-icon
                      class="mr-1"
                      :color="getDepartureTimeColor(route)"
                      icon="mdi-clock"
                      size="small"
                    />
                    <span class="text-body-2" :class="getDepartureTimeClass(route)">
                      {{ formatDepartureTime(route.plannedDepartureTime) }}
                    </span>
                  </div>
                </div>

                <div class="d-flex align-center gap-2">
                  <!-- Timeline Button -->
                  <v-btn
                    color="primary"
                    icon="mdi-timeline-clock"
                    size="small"
                    variant="outlined"
                    @click="openTimelineDialog(route)"
                  />
                </div>
              </v-card-title>

              <v-card-text>
                <!-- Route Summary -->
                <div class="text-right mb-3">
                  <div class="text-body-2 font-weight-medium">{{ getRouteStops(route.routeId).length }} stops</div>
                  <div class="text-caption text-grey">{{ formatDistance(getTotalDistance(route.routeId)) }} miles • {{ formatDuration(getTotalDuration(route.routeId)) }}</div>
                </div>

                <!-- Route Stops Table -->
                <v-table class="route-stops-table" density="compact">
                  <thead>
                    <tr>
                      <th>Stop</th>
                      <th>ETA</th>
                      <th>ATA</th>
                      <th>ETD</th>
                      <th>ATD</th>
                      <th>Notes</th>
                      <th>Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(stop, index) in getRouteStops(route.routeId)"
                      :key="stop._id || index"
                    >
                      <td class="font-weight-medium">
                        <div class="d-flex align-center">
                          <v-chip
                            class="mr-2"
                            :color="getStopColor(stop, index)"
                            size="x-small"
                            variant="flat"
                          >
                            {{ stop.sequence !== undefined ? stop.sequence : index }}
                          </v-chip>
                          <div>
                            <div v-if="stop.isTerminal" class="text-body-2">{{ stop.custName || 'Terminal' }}</div>
                            <a
                              v-else
                              class="text-body-2 customer-link"
                              :href="getCustomerPageUrl(stop)"
                              rel="noopener noreferrer"
                              target="_blank"
                              @click.stop
                            >
                              {{ stop.custName || 'Unknown Customer' }}
                              <v-icon class="ml-1" size="x-small">mdi-open-in-new</v-icon>
                            </a>
                            <div class="text-caption text-grey">{{ stop.city }}{{ stop.city && stop.state ? ', ' : '' }}{{ stop.state }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="text-caption">
                        <div v-if="stop.eta">
                          <div>{{ stop.eta }}</div>
                          <div
                            v-if="getCalculatedTimeOffset(route, stop, index, 'eta')"
                            class="text-xs"
                            :class="getOffsetClass(getCalculatedTimeOffset(route, stop, index, 'eta'))"
                          >
                            {{ getCalculatedETA(route, stop, index) }}
                            ({{ formatTimeOffset(getCalculatedTimeOffset(route, stop, index, 'eta')) }})
                          </div>
                        </div>
                        <span v-else>-</span>
                      </td>
                      <td>
                        <!-- Show ATA input unless it's the first terminal stop -->
                        <v-menu
                          v-if="!(stop.isTerminal && stop.isStart)"
                          v-model="timePickerMenus[`${route._id}-${stop._id || stop.sequence}-ata`]"
                          :close-on-content-click="false"
                          location="end"
                          min-width="0"
                        >
                          <template #activator="{ props }">
                            <v-btn
                              v-bind="props"
                              :class="[
                                'time-display-btn',
                                { 'time-not-updated': !isTimeUpdated(route, stop, 'ata') }
                              ]"
                              size="small"
                              variant="text"
                            >
                              {{ getDisplayTime(route, stop, 'ata', stop.eta) }}
                            </v-btn>
                          </template>
                          <v-time-picker
                            :model-value="getTimePickerValue(route, stop, 'ata', stop.eta)"
                            @update:model-value="updateTimeFromPicker(route, stop, 'ata', $event)"
                          >
                            <template #actions>
                              <v-btn
                                color="primary"
                                @click="confirmTimeSelection(route, stop, 'ata')"
                              >
                                OK
                              </v-btn>
                              <v-btn
                                variant="text"
                                @click="cancelTimeSelection(route, stop, 'ata')"
                              >
                                Cancel
                              </v-btn>
                            </template>
                          </v-time-picker>
                        </v-menu>
                        <span v-else class="text-caption text-grey">-</span>
                      </td>
                      <td class="text-caption">
                        <div v-if="stop.etd">
                          <div>{{ stop.etd }}</div>
                          <div
                            v-if="getCalculatedTimeOffset(route, stop, index, 'etd')"
                            class="text-xs"
                            :class="getOffsetClass(getCalculatedTimeOffset(route, stop, index, 'etd'))"
                          >
                            {{ getCalculatedETD(route, stop, index) }}
                            ({{ formatTimeOffset(getCalculatedTimeOffset(route, stop, index, 'etd')) }})
                          </div>
                        </div>
                        <span v-else>-</span>
                      </td>
                      <td>
                        <!-- Show ATD input unless it's the last terminal stop -->
                        <v-menu
                          v-if="!(stop.isTerminal && stop.isEnd)"
                          v-model="timePickerMenus[`${route._id}-${stop._id || stop.sequence}-atd`]"
                          :close-on-content-click="false"
                          location="end"
                          min-width="0"
                        >
                          <template #activator="{ props }">
                            <v-btn
                              v-bind="props"
                              :class="[
                                'time-display-btn',
                                { 'time-not-updated': !isTimeUpdated(route, stop, 'atd') }
                              ]"
                              size="small"
                              variant="text"
                            >
                              {{ getDisplayTime(route, stop, 'atd', stop.etd) }}
                            </v-btn>
                          </template>
                          <v-time-picker
                            :model-value="getTimePickerValue(route, stop, 'atd', stop.etd)"
                            @update:model-value="updateTimeFromPicker(route, stop, 'atd', $event)"
                          >
                            <template #actions>
                              <v-btn
                                color="primary"
                                @click="confirmTimeSelection(route, stop, 'atd')"
                              >
                                OK
                              </v-btn>
                              <v-btn
                                variant="text"
                                @click="cancelTimeSelection(route, stop, 'atd')"
                              >
                                Cancel
                              </v-btn>
                            </template>
                          </v-time-picker>
                        </v-menu>
                        <span v-else class="text-caption text-grey">-</span>
                      </td>
                      <td>
                        <v-btn
                          :color="getStopNotes(route, stop).length > 0 ? 'primary' : 'grey'"
                          icon
                          size="small"
                          variant="text"
                          @click="openNotesDialog(route, stop)"
                        >
                          <v-badge
                            v-if="getStopNotes(route, stop).length > 0"
                            color="primary"
                            :content="getStopNotes(route, stop).length"
                          >
                            <v-icon>mdi-note-text</v-icon>
                          </v-badge>
                          <v-icon v-else>mdi-note-plus</v-icon>
                        </v-btn>
                      </td>
                      <td>
                        <!-- Contact button only for customer stops, not terminals -->
                        <v-btn
                          v-if="!stop.isTerminal"
                          color="green"
                          icon
                          size="small"
                          variant="text"
                          @click="contactCustomer(route, stop)"
                        >
                          <v-icon>mdi-phone</v-icon>
                        </v-btn>
                        <span v-else class="text-caption text-grey">-</span>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Table View -->
        <v-card v-else-if="viewMode === 'table' && filteredRoutes.length > 0">
          <v-card-text>
            <v-data-table
              :headers="tableViewHeaders"
              :items="tableViewData"
              v-model:sort-by="tableSortBy"
              class="elevation-0"
              item-value="id"
              density="comfortable"
              :items-per-page="-1"
              hide-default-footer
            >
              <!-- Route Name column -->
              <template #item.routeName="{ item }">
                <span class="font-weight-medium">{{ item.routeName }}</span>
              </template>

              <!-- Stop Number column -->
              <template #item.stopNumber="{ item }">
                <v-chip 
                  :color="getStopChipColor(item.stopNumber, item.totalStops)"
                  size="small"
                  variant="outlined"
                >
                  {{ getStopDisplayNumber(item.stopNumber, item.totalStops) }}
                </v-chip>
              </template>

              <!-- Planned Driver/Truck column -->
              <template #item.driverTruck="{ item }">
                <div>
                  <div class="font-weight-medium">{{ item.driverName || 'No Driver' }}</div>
                  <div v-if="item.truckNumber" class="text-caption text-grey">{{ item.truckNumber }}</div>
                </div>
              </template>
              <!-- GEOtab Driver/Truck column -->
              <template #item.geotabDriverTruck="{ item }">
                <div>
                  <div class="font-weight-medium">{{ item.geotabDriverName || '-' }}</div>
                  <div v-if="item.geotabTruckNumber" class="text-caption text-grey">{{ item.geotabTruckNumber }}</div>
                </div>
              </template>

              <!-- Site Name column -->
              <template #item.siteName="{ item }">
                <div>
                  <div class="font-weight-medium">{{ item.siteName }}</div>
                  <div v-if="item.cityState" class="text-caption text-grey">{{ item.cityState }}</div>
                </div>
              </template>

              <!-- Geotab column -->
              <template #item.geotab="{ item }">
                <v-btn
                  v-if="item.geotabMatch && item.geotabMatch.length > 0"
                  icon
                  size="small"
                  variant="text"
                  color="success"
                  @click.stop="openGeotabDialog(item)"
                >
                  <v-badge
                    v-if="item.geotabMatch.length > 1"
                    color="primary"
                    :content="item.geotabMatch.length"
                  >
                    <v-icon>mdi-check-circle</v-icon>
                  </v-badge>
                  <v-icon v-else>mdi-check-circle</v-icon>
                </v-btn>
                <v-btn
                  v-else
                  icon
                  size="small"
                  variant="text"
                  color="error"
                  @click.stop="openGeotabDialog(item)"
                >
                  <v-icon>mdi-close-circle</v-icon>
                </v-btn>
              </template>

              <!-- Coordinates column -->
              <template #item.coordinates="{ item }">
                <div class="text-caption font-mono">
                  <div v-if="item.latitude && item.longitude">
                    {{ Number(item.latitude).toFixed(3) }}, {{ Number(item.longitude).toFixed(3) }}
                  </div>
                  <div v-else class="text-grey">N/A</div>
                </div>
              </template>

              <!-- ETA column -->
              <template #item.eta="{ item }">
                <span class="text-caption">{{ item.eta || 'N/A' }}</span>
              </template>

              <!-- ATA column -->
              <template #item.ata="{ item }">
                <!-- Show ATA input unless it's the terminal start -->
                <v-menu
                  v-if="!isTableTerminalStart(item)"
                  v-model="timePickerMenus[`${item.routeId}-${item.stopId}-ata`]"
                  :close-on-content-click="false"
                  location="end"
                  min-width="0"
                >
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      :class="[
                        'time-display-btn',
                        { 'time-not-updated': !isTableTimeUpdated(item, 'ata') }
                      ]"
                      size="small"
                      variant="text"
                    >
                      {{ getTableDisplayTime(item, 'ata') }}
                    </v-btn>
                  </template>
                  <v-time-picker
                    :model-value="getTableTimePickerValue(item, 'ata')"
                    @update:model-value="updateTableTimeFromPicker(item, 'ata', $event)"
                  >
                    <template #actions>
                      <v-btn
                        color="primary"
                        @click="confirmTableTimeSelection(item, 'ata')"
                      >
                        OK
                      </v-btn>
                      <v-btn
                        variant="text"
                        @click="cancelTableTimeSelection(item, 'ata')"
                      >
                        Cancel
                      </v-btn>
                    </template>
                  </v-time-picker>
                </v-menu>
                <span v-else class="text-caption text-grey">-</span>
              </template>

              <!-- ETD column -->
              <template #item.etdSortValue="{ item }">
                <span class="text-caption">{{ item.etd || 'N/A' }}</span>
              </template>

              <!-- ATD column -->
              <template #item.atd="{ item }">
                <!-- Show ATD input unless it's the terminal end -->
                <v-menu
                  v-if="!isTableTerminalEnd(item)"
                  v-model="timePickerMenus[`${item.routeId}-${item.stopId}-atd`]"
                  :close-on-content-click="false"
                  location="end"
                  min-width="0"
                >
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      :class="[
                        'time-display-btn',
                        { 'time-not-updated': !isTableTimeUpdated(item, 'atd') }
                      ]"
                      size="small"
                      variant="text"
                    >
                      {{ getTableDisplayTime(item, 'atd') }}
                    </v-btn>
                  </template>
                  <v-time-picker
                    :model-value="getTableTimePickerValue(item, 'atd')"
                    @update:model-value="updateTableTimeFromPicker(item, 'atd', $event)"
                  >
                    <template #actions>
                      <v-btn
                        color="primary"
                        @click="confirmTableTimeSelection(item, 'atd')"
                      >
                        OK
                      </v-btn>
                      <v-btn
                        variant="text"
                        @click="cancelTableTimeSelection(item, 'atd')"
                      >
                        Cancel
                      </v-btn>
                    </template>
                  </v-time-picker>
                </v-menu>
                <span v-else class="text-caption text-grey">-</span>
              </template>

              <!-- Notes column -->
              <template #item.notes="{ item }">
                <v-btn
                  :color="getTableStopNotes(item).length > 0 ? 'primary' : 'grey'"
                  icon
                  size="small"
                  variant="text"
                  @click="openTableNotesDialog(item)"
                >
                  <v-badge
                    v-if="getTableStopNotes(item).length > 0"
                    color="primary"
                    :content="getTableStopNotes(item).length"
                  >
                    <v-icon>mdi-note-text</v-icon>
                  </v-badge>
                  <v-icon v-else>mdi-note-plus</v-icon>
                </v-btn>
              </template>

              <!-- Contact column -->
              <template #item.contact="{ item }">
                <v-btn
                  v-if="!isTableTerminalStart(item) && !isTableTerminalEnd(item)"
                  color="green"
                  icon
                  size="small"
                  variant="text"
                  @click="contactTableCustomer(item)"
                >
                  <v-icon>mdi-phone</v-icon>
                </v-btn>
                <span v-else class="text-caption text-grey">-</span>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>

        <!-- No Routes Found -->
        <v-card v-else-if="filteredRoutes.length === 0">
          <v-card-text class="text-center py-12">
            <v-icon class="mb-4" color="grey" icon="mdi-truck-remove" size="64" />
            <h3 class="text-h6 text-grey mb-2">No routes scheduled for today</h3>
            <p class="text-body-2 text-grey-lighten-1">
              There are no routes scheduled for {{ terminal?.name }} on {{ new Date().toLocaleDateString() }}
            </p>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- Timeline Dialog -->
    <v-dialog
      v-model="timelineDialog.show"
      fullscreen-mobile
      max-width="1600px"
      scrollable
    >
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon
              class="mr-2"
              :color="getRouteStatusColor(timelineDialog.route?.status)"
              :icon="getRouteStatusIcon(timelineDialog.route?.status)"
            />
            <span class="font-weight-bold text-h6">{{ getRouteNumber(timelineDialog.route?.routeId) }} - Route Timeline</span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="timelineDialog.show = false"
          />
        </v-card-title>

        <v-card-text class="pa-6">
          <div v-if="timelineDialog.route" class="timeline-scroll-container">
            <v-timeline
              class="route-timeline"
              direction="horizontal"
              truncate-line="both"
            >
              <v-timeline-item
                v-for="(stop, index) in getRouteStops(timelineDialog.route.routeId)"
                :key="stop._id || index"
                :dot-color="getStopColor(stop, index)"
                size="small"
              >
                <!-- Stop number in timeline circle -->
                <template #icon>
                  <span v-if="shouldShowTruckAtStop(timelineDialog.route, index)" class="white--text font-weight-bold">
                    <v-icon color="white" size="16">mdi-truck</v-icon>
                  </span>
                  <span v-else class="white--text font-weight-bold">
                    {{ stop.sequence !== undefined ? stop.sequence : index }}
                  </span>
                </template>

                <v-card
                  class="timeline-stop-card elevation-2"
                  :class="{
                    'border-success': shouldShowTruckAtStop(timelineDialog.route, index)
                  }"
                >
                  <v-card-text class="pa-3">
                    <!-- Stop header -->
                    <div class="d-flex align-center justify-space-between mb-2">
                      <div class="text-body-2 font-weight-bold text-truncate">
                        {{ stop.custName || `Stop ${index + 1}` }}
                      </div>
                      <div class="d-flex align-center">
                        <v-chip
                          v-if="stop.isTerminal"
                          color="primary"
                          size="x-small"
                          variant="tonal"
                        >
                          {{ stop.isStart ? 'Start' : 'End' }}
                        </v-chip>
                        <v-icon
                          v-if="shouldShowTruckAtStop(timelineDialog.route, index)"
                          class="ml-1"
                          color="success"
                          size="16"
                        >
                          mdi-truck
                        </v-icon>
                      </div>
                    </div>

                    <!-- Address -->
                    <div class="text-caption text-grey mb-2">
                      <div class="text-truncate">{{ stop.address }}</div>
                      <div class="text-truncate">
                        {{ stop.city }}{{ stop.city && stop.state ? ', ' : '' }}{{ stop.state }} {{ stop.zipCode }}
                      </div>
                    </div>

                    <!-- Times and Distance -->
                    <div class="d-flex justify-space-between align-center mb-2">
                      <!-- Distance and duration (left side) -->
                      <div v-if="index > 0" class="text-caption text-grey">
                        <div class="d-flex align-center mb-1">
                          <v-icon class="mr-1" size="12">mdi-map-marker-distance</v-icon>
                          <span>{{ formatDistance(getDistanceBetweenStops(timelineDialog.route.routeId, index - 1, index)) }} mi</span>
                        </div>
                        <div class="d-flex align-center">
                          <v-icon class="mr-1" size="12">mdi-clock</v-icon>
                          <span>{{ formatDuration(getDurationBetweenStops(timelineDialog.route.routeId, index - 1, index)) }}</span>
                        </div>
                      </div>

                      <!-- ETA/ETD (right side) -->
                      <div class="text-caption text-right">
                        <div v-if="stop.eta" class="d-flex align-center justify-end mb-1">
                          <v-icon class="mr-1" size="12">mdi-clock-in</v-icon>
                          <span>ETA: {{ stop.eta }}</span>
                        </div>
                        <div v-if="stop.etd" class="d-flex align-center justify-end">
                          <v-icon class="mr-1" size="12">mdi-clock-out</v-icon>
                          <span>ETD: {{ stop.etd }}</span>
                        </div>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-timeline-item>
            </v-timeline>
          </div>
        </v-card-text>

      </v-card>
    </v-dialog>

    <!-- Notes Dialog -->
    <v-dialog
      v-model="notesDialog.show"
      max-width="800px"
      scrollable
    >
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" icon="mdi-note-text" />
            <span>Notes - {{ notesDialog.stop?.custName || 'Terminal' }}</span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="notesDialog.show = false"
          />
        </v-card-title>

        <v-card-text class="pa-0">
          <!-- Existing Notes -->
          <div v-if="getCurrentStopNotes().length > 0" class="pa-4">
            <h3 class="text-subtitle-1 mb-3">Existing Notes</h3>
            <v-card
              v-for="(note, index) in getCurrentStopNotes()"
              :key="index"
              class="mb-3"
              variant="outlined"
            >
              <v-card-text class="pa-3">
                <div class="d-flex justify-space-between align-start mb-2">
                  <v-chip
                    :color="getNoteTypeColor(note.type)"
                    size="small"
                    variant="tonal"
                  >
                    {{ note.type }}
                  </v-chip>
                  <div class="text-caption text-grey">
                    {{ formatDateTime(note.timestamp) }} - {{ note.author }}
                  </div>
                </div>
                <p class="text-body-2 mb-0">{{ note.content }}</p>
              </v-card-text>
            </v-card>
          </div>

          <!-- Add New Note -->
          <div class="pa-4" style="border-top: 1px solid #e0e0e0;">
            <h3 class="text-subtitle-1 mb-3">Add New Note</h3>
            <v-row>
              <v-col cols="12" md="3">
                <v-select
                  v-model="newNote.type"
                  :items="noteTypes"
                  label="Note Type"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="9">
                <v-textarea
                  v-model="newNote.content"
                  label="Note Content"
                  placeholder="Enter your note..."
                  rows="3"
                  variant="outlined"
                />
              </v-col>
            </v-row>
            <div class="d-flex justify-end gap-2">
              <v-btn
                variant="outlined"
                @click="notesDialog.show = false"
              >
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                :disabled="!newNote.content.trim()"
                @click="addNote"
              >
                Add Note
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Late Reason Dialog -->
    <v-dialog
      v-model="lateReasonDialog.show"
      max-width="600px"
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="warning" icon="mdi-clock-alert" />
          <span>Late Time Detected</span>
        </v-card-title>

        <v-card-text>
          <div class="mb-4">
            <p class="text-body-1">
              The {{ lateReasonDialog.timeType.toUpperCase() }} time for
              <strong>{{ lateReasonDialog.stop?.custName || 'Terminal' }}</strong>
              is significantly late. Please provide a reason:
            </p>

            <div v-if="lateReasonDialog.cascadingDelay" class="mt-3 p-3 bg-grey-lighten-5 rounded">
              <div class="text-body-2">
                <strong>Delay Breakdown:</strong>
              </div>
              <div class="text-caption mt-1">
                • Pre-existing route delay: {{ formatTimeOffset(lateReasonDialog.cascadingDelay) }}
              </div>
              <div class="text-caption">
                • Additional delay at this stop: {{ formatTimeOffset(lateReasonDialog.additionalDelay) }}
              </div>
              <div class="text-caption font-weight-bold text-error">
                • Total delay: {{ formatTimeOffset(lateReasonDialog.cascadingDelay + lateReasonDialog.additionalDelay) }}
              </div>
            </div>
          </div>

          <v-select
            v-model="lateReasonDialog.reason"
            class="mb-4"
            :items="lateReasons"
            label="Late Reason"
            variant="outlined"
          />

          <v-textarea
            v-model="lateReasonDialog.notes"
            label="Additional Notes (Optional)"
            placeholder="Any additional details..."
            rows="3"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="outlined"
            @click="lateReasonDialog.show = false"
          >
            Skip
          </v-btn>
          <v-btn
            color="warning"
            :disabled="!lateReasonDialog.reason"
            @click="saveLateReason"
          >
            Save Reason
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Customer Communication Dialog -->
    <v-dialog
      v-model="communicationDialog.show"
      max-width="1000px"
      scrollable
    >
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="green" icon="mdi-phone" />
            <span>Customer Communication - {{ communicationDialog.stop?.custName }}</span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="communicationDialog.show = false"
          />
        </v-card-title>

        <v-card-text class="pa-0">
          <v-row no-gutters>
            <!-- Contact Information Panel -->
            <v-col class="border-e" cols="12" md="4">
              <div class="pa-4">
                <h3 class="text-subtitle-1 mb-3">
                  <v-icon class="mr-2" icon="mdi-account-circle" />
                  Contact Information
                </h3>
                <div class="mb-3">
                  <div class="text-body-2 font-weight-bold">{{ communicationDialog.stop?.custName }}</div>
                  <div class="text-caption text-grey">Customer</div>
                </div>
                <div class="mb-3">
                  <div class="text-body-2">{{ communicationDialog.stop?.address }}</div>
                  <div class="text-body-2">{{ communicationDialog.stop?.city }}, {{ communicationDialog.stop?.state }} {{ communicationDialog.stop?.zipCode }}</div>
                  <div class="text-caption text-grey">Address</div>
                </div>
                <div class="mb-3">
                  <div class="text-body-2">{{ communicationDialog.stop?.openTime }} - {{ communicationDialog.stop?.closeTime }}</div>
                  <div class="text-caption text-grey">Operating Hours</div>
                </div>

                <!-- Placeholder for future contact details -->
                <v-divider class="my-3" />
                <div class="text-caption text-grey">
                  <v-icon class="mr-1" size="small">mdi-information</v-icon>
                  Contact details and instructions will be populated from customer database
                </div>
              </div>
            </v-col>

            <!-- Communication Panel -->
            <v-col cols="12" md="8">
              <div class="pa-4">
                <!-- Communication History -->
                <h3 class="text-subtitle-1 mb-3">
                  <v-icon class="mr-2" icon="mdi-history" />
                  Communication History
                </h3>

                <div v-if="getCustomerCommunications(communicationDialog.route, communicationDialog.stop).length > 0" class="mb-4">
                  <v-card
                    v-for="(comm, index) in getCustomerCommunications(communicationDialog.route, communicationDialog.stop)"
                    :key="index"
                    class="mb-2"
                    variant="outlined"
                  >
                    <v-card-text class="pa-3">
                      <div class="d-flex justify-space-between align-start mb-2">
                        <v-chip
                          :color="getMethodColor(comm.method)"
                          size="small"
                          variant="tonal"
                        >
                          <v-icon class="mr-1" size="small">
                            {{ comm.method === 'Phone' ? 'mdi-phone' :
                              comm.method === 'Email' ? 'mdi-email' :
                              comm.method === 'Text/SMS' ? 'mdi-message-text' :
                              comm.method === 'In-Person' ? 'mdi-account-group' :
                              comm.method === 'Voicemail' ? 'mdi-voicemail' : 'mdi-help-circle' }}
                          </v-icon>
                          {{ comm.method }}
                        </v-chip>
                        <div class="text-caption text-grey">
                          {{ formatDateTime(comm.timestamp) }} - {{ comm.dispatcher }}
                        </div>
                      </div>

                      <div class="mb-2">
                        <div class="text-body-2 font-weight-medium mb-1">Message:</div>
                        <div class="text-body-2">{{ comm.message }}</div>
                      </div>

                      <div v-if="comm.feedback" class="mb-2">
                        <div class="text-body-2 font-weight-medium mb-1">Customer Feedback:</div>
                        <div class="text-body-2">{{ comm.feedback }}</div>
                      </div>

                      <v-alert
                        v-if="comm.escalated"
                        class="mt-2"
                        density="compact"
                        type="warning"
                      >
                        <div class="text-body-2 font-weight-medium">Escalated</div>
                        <div class="text-caption">{{ comm.escalationReason }}</div>
                      </v-alert>
                    </v-card-text>
                  </v-card>
                </div>
                <div v-else class="text-center py-4 text-grey">
                  No previous communications recorded
                </div>

                <!-- New Communication Form -->
                <v-divider class="my-4" />
                <h3 class="text-subtitle-1 mb-3">
                  <v-icon class="mr-2" icon="mdi-plus" />
                  New Communication
                </h3>

                <v-row>
                  <v-col cols="12" md="4">
                    <v-select
                      v-model="newCommunication.method"
                      density="compact"
                      :items="getCommunicationMethods()"
                      label="Communication Method"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="8">
                    <v-textarea
                      v-model="newCommunication.message"
                      density="compact"
                      label="Message/Information Communicated"
                      placeholder="Describe what was communicated to the customer..."
                      rows="3"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>

                <v-row>
                  <v-col cols="12">
                    <v-textarea
                      v-model="newCommunication.feedback"
                      density="compact"
                      label="Customer Feedback/Response (Optional)"
                      placeholder="Record any customer response or feedback..."
                      rows="2"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>

                <!-- Escalation Section -->
                <v-row>
                  <v-col cols="12">
                    <v-checkbox
                      v-model="newCommunication.escalated"
                      color="warning"
                      label="Escalate this communication"
                    />
                  </v-col>
                </v-row>

                <v-row v-if="newCommunication.escalated">
                  <v-col cols="12">
                    <v-textarea
                      v-model="newCommunication.escalationReason"
                      density="compact"
                      label="Escalation Reason"
                      placeholder="Explain why this requires escalation..."
                      rows="2"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>

                <div class="d-flex justify-end gap-2 mt-4">
                  <v-btn
                    variant="outlined"
                    @click="communicationDialog.show = false"
                  >
                    Close
                  </v-btn>
                  <v-btn
                    color="primary"
                    :disabled="!newCommunication.message.trim()"
                    @click="addCommunication"
                  >
                    Record Communication
                  </v-btn>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Geotab Dialog -->
    <v-dialog
      v-model="geotabDialog.show"
      max-width="800px"
      scrollable
    >
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-map-marker-path</v-icon>
            <span class="font-weight-bold text-h6">Geotab Trip Match Details</span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="geotabDialog.show = false"
          />
        </v-card-title>

        <v-card-text class="pa-6">
          <div v-if="geotabDialog.item">
            <!-- Stop Information -->
            <v-card class="mb-4" variant="outlined">
              <v-card-title class="text-h6 pb-2">Stop Information</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <div class="mb-2">
                      <strong>Route:</strong> {{ geotabDialog.item.routeName }}
                    </div>
                    <div class="mb-2">
                      <strong>Stop:</strong> {{ geotabDialog.item.siteName }}
                    </div>
                    <div class="mb-2">
                      <strong>Coordinates:</strong> 
                      <span v-if="geotabDialog.item.latitude && geotabDialog.item.longitude">
                        {{ Number(geotabDialog.item.latitude).toFixed(6) }}, {{ Number(geotabDialog.item.longitude).toFixed(6) }}
                      </span>
                      <span v-else class="text-grey">N/A</span>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="mb-2">
                      <strong>Driver:</strong> {{ geotabDialog.item.driverName || 'No Driver' }}
                    </div>
                    <div class="mb-2">
                      <strong>Truck:</strong> {{ geotabDialog.item.truckNumber || 'No Truck' }}
                    </div>
                    <div class="mb-2">
                      <strong>Expected Arrival:</strong> {{ geotabDialog.item.eta || 'N/A' }}
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Trip Match Results -->
            <v-card variant="outlined">
              <v-card-title class="text-h6 pb-2">
                <v-icon 
                  :color="geotabDialog.item.geotabMatch && geotabDialog.item.geotabMatch.length > 0 ? 'success' : 'error'" 
                  class="mr-2"
                >
                  {{ geotabDialog.item.geotabMatch && geotabDialog.item.geotabMatch.length > 0 ? 'mdi-check-circle' : 'mdi-close-circle' }}
                </v-icon>
                <span v-if="geotabDialog.item.geotabMatch && geotabDialog.item.geotabMatch.length > 0">
                  {{ geotabDialog.item.geotabMatch.length }} Trip Match{{ geotabDialog.item.geotabMatch.length > 1 ? 'es' : '' }} Found
                </span>
                <span v-else>No Trip Matches Found</span>
              </v-card-title>
              <v-card-text>
                <div v-if="geotabDialog.item.geotabMatch && geotabDialog.item.geotabMatch.length > 0">
                  <!-- Loop through all potential matches -->
                  <v-card 
                    v-for="(match, index) in geotabDialog.item.geotabMatch" 
                    :key="index"
                    class="mb-3"
                    variant="outlined"
                    color="success"
                  >
                    <v-card-title class="text-subtitle-1 pb-2">
                      Location Match #{{ index + 1 }}
                      <v-chip 
                        color="success" 
                        size="small" 
                        class="ml-2"
                      >
                        Within 0.1 Miles
                      </v-chip>
                    </v-card-title>
                    <v-card-text>
                      <v-row>
                        <v-col cols="12" md="6">
                          <div class="mb-2">
                            <strong>Trip Start:</strong> {{ match.start || 'Unknown' }}
                          </div>
                          <div class="mb-2">
                            <strong>Trip Stop:</strong> {{ match.stop || 'Unknown' }}
                          </div>
                          <div class="mb-2">
                            <strong>Next Trip Start:</strong> {{ match.nextTripStart || 'N/A' }}
                          </div>
                          <div class="mb-2">
                            <strong>Trip Coordinates:</strong> 
                            {{ Number(match.stopPoint?.y || 0).toFixed(6) }}, {{ Number(match.stopPoint?.x || 0).toFixed(6) }}
                          </div>
                          <div class="mb-2">
                            <strong>Distance from Stop:</strong> 
                            <span class="text-success">
                              {{ match.distance.toFixed(3) }} miles
                            </span>
                          </div>
                        </v-col>
                        <v-col cols="12" md="6">
                          <div class="mb-2">
                            <strong>Trip Driver:</strong> 
                            <span class="text-info">
                              {{ match.driverName || match.driverInfo?.driver || match.driver?.name || 'Unknown' }}
                            </span>
                          </div>
                          <div class="mb-2">
                            <strong>Trip Vehicle:</strong> 
                            <span class="text-info">
                              {{ match.truckID || match.deviceInfo?.truckID || match.device?.name || 'Unknown' }}
                            </span>
                          </div>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </div>
                <div v-else class="text-center text-grey pa-4">
                  <v-icon size="48" color="grey" class="mb-2">mdi-map-marker-off</v-icon>
                  <p>No matching trip data found within 0.1 miles of this stop location.</p>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'
  import { findTerminalByUrlId } from '@/utils/terminal-url-helpers'

  const authStore = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  // Get terminal URL ID from URL params or query (for consistency with planning.vue)
  const terminalUrlId = (route.params.id || route.query.terminalId) as string
  const terminalId = ref<string>('')

  // Reactive data
  const loading = ref(true)
  const routesLoading = ref(false)
  const refreshing = ref(false)
  const autoRefresh = ref(true)

  const terminal = ref<any>(null)
  const routes = ref<any[]>([])
  const drivers = ref<Map<string, any>>(new Map())
  const equipment = ref<Map<string, any>>(new Map())
  const routeSubstitutions = ref<Map<string, any[]>>(new Map())
  const terminalRoutes = ref<any[]>([])
  const routeStops = ref<Map<string, any[]>>(new Map())

  const lastUpdated = ref(new Date())

  // Date navigation - initialize from URL or default to today
  const initializeDateFromUrl = (): Date => {
    const urlDate = route.query.date as string
    if (urlDate) {
      const parsedDate = new Date(urlDate + 'T12:00:00') // Add time to avoid timezone issues
      // Validate that the parsed date is valid
      if (!isNaN(parsedDate.getTime())) {
        console.log('Initialized date from URL:', urlDate, '->', parsedDate)
        return parsedDate
      }
    }
    return new Date() // Default to today
  }

  const selectedDate = ref(initializeDateFromUrl())
  const datePickerMenu = ref(false)

  // GeoTab trip data integration
  const tripDataLoading = ref(false)
  const tripData = ref<any[]>([])
  const routeTripMatches = ref<Map<string, boolean>>(new Map())

  // View mode toggle
  const viewMode = ref('table') // 'per-route' or 'table'

  // Filters
  const routeSearch = ref('')
  const statusFilter = ref('all')
  const priorityFilter = ref('all')

  // Timeline dialog
  const timelineDialog = ref({
    show: false,
    route: null as any,
  })

  const geotabDialog = ref({
    show: false,
    item: null as any,
  })

  // Table sorting state
  const tableSortBy = ref([{ key: 'etdSortValue', order: 'asc' as 'asc' | 'desc' }])

  // Notes dialog
  const notesDialog = ref({
    show: false,
    route: null as any,
    stop: null as any,
  })

  // New note data
  const newNote = ref({
    content: '',
    type: 'General',
  })

  // Late reason dialog
  const lateReasonDialog = ref({
    show: false,
    route: null as any,
    stop: null as any,
    timeType: 'ata' as 'ata' | 'atd',
    reason: '',
    notes: '',
    additionalDelay: 0,
    cascadingDelay: 0,
  })

  // Customer communication dialog
  const communicationDialog = ref({
    show: false,
    route: null as any,
    stop: null as any,
  })

  // New communication entry
  const newCommunication = ref({
    method: 'Phone',
    message: '',
    feedback: '',
    escalated: false,
    escalationReason: '',
  })

  // Route notes storage (in real app, this would be from database)
  const routeNotes = ref<Map<string, any[]>>(new Map())

  // Customer communication logs (in real app, this would be from database)
  const customerCommunications = ref<Map<string, any[]>>(new Map())

  // Actual times storage (in real app, this would be from database)
  const actualTimes = ref<Map<string, any>>(new Map())

  // Time picker menu states
  const timePickerMenus = ref<Record<string, boolean>>({})

  // Temporary time picker values (before confirmation)
  const tempTimePickerValues = ref<Record<string, string>>({})

  // Filter options
  const statusFilterOptions = [
    { title: 'All Status', value: 'all' },
    { title: 'Planned', value: 'planned' },
    { title: 'Assigned', value: 'assigned' },
    { title: 'Dispatched', value: 'dispatched' },
    { title: 'In Transit', value: 'in-transit' },
    { title: 'Completed', value: 'completed' },
    { title: 'Delayed', value: 'delayed' },
    { title: 'Cancelled', value: 'cancelled' },
  ]

  const priorityFilterOptions = [
    { title: 'All Priorities', value: 'all' },
    { title: 'Normal', value: 'normal' },
    { title: 'High', value: 'high' },
    { title: 'Urgent', value: 'urgent' },
  ]

  // Real-time fleet data table headers
  // Computed
  const selectedDateRoutesHeader = computed(() => {
    const today = new Date()
    const isToday = selectedDate.value.toDateString() === today.toDateString()
    
    if (isToday) {
      return "Today's Routes"
    } else {
      return `${selectedDate.value.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })} Routes`
    }
  })

  // Table view headers
  const tableViewHeaders = [
    { title: 'Route', value: 'routeName', sortable: true },
    { title: 'Stop #', value: 'stopNumber', sortable: true },
    { title: 'Planned\nDriver/Truck', value: 'driverTruck', sortable: true },
    { title: 'GEOtab\nDriver/Truck', value: 'geotabDriverTruck', sortable: true },
    { title: 'Site Name', value: 'siteName', sortable: true },
    { title: 'Geotab', value: 'geotab', sortable: false },
    { title: 'Coordinates', value: 'coordinates', sortable: false },
    { title: 'ETA', value: 'eta', sortable: true },
    { title: 'ATA', value: 'ata', sortable: true },
    { title: 'ETD', value: 'etdSortValue', sortable: true },
    { title: 'ATD', value: 'atd', sortable: true },
    { title: 'Notes', value: 'notes', sortable: false },
    { title: 'Contact', value: 'contact', sortable: false }
  ]

  // Helper function to convert time to sortable number accounting for day transitions
  const getETDSortValue = (etdTime: string, routeStops: any[], stopIndex: number): number => {
    if (!etdTime || etdTime === 'N/A') return 99999 // Put N/A times at the end
    
    // Parse time (assume format like "11:30 PM" or "23:30")
    const timeToMinutes = (timeStr: string): number => {
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        // 12-hour format
        const [time, period] = timeStr.split(' ')
        const [hours, minutes] = time.split(':').map(Number)
        let hour24 = hours
        if (period === 'PM' && hours !== 12) hour24 += 12
        if (period === 'AM' && hours === 12) hour24 = 0
        return hour24 * 60 + minutes
      } else {
        // 24-hour format
        const [hours, minutes] = timeStr.split(':').map(Number)
        return hours * 60 + minutes
      }
    }
    
    const currentMinutes = timeToMinutes(etdTime)
    
    // For terminal start, check if we need to adjust for day transition
    if (stopIndex === 0 && routeStops.length > 0) {
      const firstStopETA = routeStops[0]?.eta
      if (firstStopETA && firstStopETA !== 'N/A') {
        const firstStopMinutes = timeToMinutes(firstStopETA)
        // If terminal ETD is significantly later in the day than first stop ETA,
        // assume the terminal ETD is from the previous day
        if (currentMinutes > firstStopMinutes && (currentMinutes - firstStopMinutes) > 12 * 60) {
          return currentMinutes - (24 * 60) // Subtract a day's worth of minutes
        }
      }
    }
    
    return currentMinutes
  }

  // Table view data - flattens all route stops into a single table
  const tableViewData = computed(() => {
    const allStops: any[] = []
    
    for (const route of filteredRoutes.value) {
      const routeName = getRouteNumber(route.routeId)
      const stops = routeStops.value.get(route.routeId) || []
      
      // Add terminal start (stop 0)
      allStops.push({
        id: `${route.routeId}-start`,
        routeId: route.routeId,
        stopId: 'start',
        routeName,
        stopNumber: 0,
        totalStops: stops.length + 1, // +1 for terminal end
        driverName: getRouteDriverName(route),
        truckNumber: getTruckInfo(route),
        siteName: terminal.value?.name || 'Terminal',
        cityState: terminal.value?.city && terminal.value?.state 
          ? `${terminal.value.city}, ${terminal.value.state}` 
          : '',
        latitude: terminal.value?.latitude,
        longitude: terminal.value?.longitude,
        eta: route.plannedDepartureTime || 'N/A',
        ata: 'N/A', // Actual arrival time at terminal start
        etd: route.plannedDepartureTime || 'N/A',
        atd: 'N/A', // Actual departure time from terminal
        notes: 'Terminal Start',
        contact: 'Terminal',
        expectedETA: route.plannedDepartureTime,
        expectedETD: route.plannedDepartureTime,
        etdSortValue: getETDSortValue(route.plannedDepartureTime || '', stops, 0),
        geotabMatch: null,
        geotabDriverName: null,
        geotabTruckNumber: null,
      })
      
      // Add route stops
      stops.forEach((stop: any, index: number) => {
        allStops.push({
          id: `${route.routeId}-${stop._id}`,
          routeId: route.routeId,
          stopId: stop._id,
          routeName,
          stopNumber: index + 1,
          totalStops: stops.length + 1, // +1 for terminal end
          driverName: getRouteDriverName(route),
          truckNumber: getTruckInfo(route),
          siteName: stop.custName || 'Unknown Stop',
          cityState: stop.city && stop.state 
            ? `${stop.city}, ${stop.state}` 
            : '',
          latitude: stop.latitude,
          longitude: stop.longitude,
          eta: stop.eta || 'N/A',
          ata: 'N/A', // Placeholder for actual arrival time
          etd: stop.etd || 'N/A',
          atd: 'N/A', // Placeholder for actual departure time
          notes: stop.notes || '',
          contact: stop.customerPDC || stop.contact || '',
          expectedETA: stop.eta,
          expectedETD: stop.etd,
          etdSortValue: getETDSortValue(stop.etd || '', stops, index + 1),
          geotabMatch: null,
          geotabDriverName: null,
          geotabTruckNumber: null,
        })
      })
      
      // Add terminal end (last stop)
      allStops.push({
        id: `${route.routeId}-end`,
        routeId: route.routeId,
        stopId: 'end',
        routeName,
        stopNumber: stops.length + 1,
        totalStops: stops.length + 1,
        driverName: getRouteDriverName(route),
        truckNumber: getTruckInfo(route),
        siteName: terminal.value?.name || 'Terminal',
        cityState: terminal.value?.city && terminal.value?.state 
          ? `${terminal.value.city}, ${terminal.value.state}` 
          : '',
        latitude: terminal.value?.latitude,
        longitude: terminal.value?.longitude,
        eta: 'N/A', // Estimated return time
        ata: 'N/A', // Actual arrival time back to terminal
        etd: 'N/A', // No departure from terminal end
        atd: 'N/A',
        notes: 'Terminal End',
        contact: 'Terminal',
        expectedETA: null,
        expectedETD: null,
        etdSortValue: 99999, // Terminal end goes last
        geotabMatch: null,
        geotabDriverName: null,
        geotabTruckNumber: null,
      })
    }
    
    return allStops
  })

  const filteredRoutes = computed(() => {
    let filtered = routes.value

    // Search filter
    if (routeSearch.value) {
      const searchLower = routeSearch.value.toLowerCase()
      filtered = filtered.filter(route =>
        getRouteNumber(route.routeId).toLowerCase().includes(searchLower)
        || route.status.toLowerCase().includes(searchLower),
      )
    }

    // Status filter
    if (statusFilter.value !== 'all') {
      filtered = filtered.filter(route => route.status === statusFilter.value)
    }

    // Priority filter
    if (priorityFilter.value !== 'all') {
      filtered = filtered.filter(route => route.priority === priorityFilter.value)
    }

    return filtered.sort((a, b) => {
      // Sort by departure time, then by priority
      const timeA = a.plannedDepartureTime || '23:59'
      const timeB = b.plannedDepartureTime || '23:59'
      if (timeA !== timeB) return timeA.localeCompare(timeB)

      const priorityOrder = { urgent: 0, high: 1, normal: 2 }
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
    })
  })

  // Methods

  const loadTerminalDetails = async () => {
    try {
      console.log('loadTerminalDetails called with terminalUrlId:', terminalUrlId)

      // First, load all terminals to resolve URL ID to ObjectID
      const allTerminalsResponse = await feathersClient.service('terminals').find({
        query: { $limit: 1000 },
      })

      const allTerminals = allTerminalsResponse.data || []
      console.log('All terminals loaded:', allTerminals.length)
      console.log('Looking for terminal with URL ID:', terminalUrlId)

      // Find the terminal by URL ID
      const foundTerminal = findTerminalByUrlId(allTerminals, terminalUrlId)
      console.log('findTerminalByUrlId result:', foundTerminal)

      if (!foundTerminal) {
        console.error('Terminal not found for URL ID:', terminalUrlId)
        console.log('Available terminals:', allTerminals.map(t => ({ name: t.name, _id: t._id })))
        terminal.value = null
        return
      }

      // Set the resolved ObjectID
      terminalId.value = foundTerminal._id
      terminal.value = foundTerminal

      console.log('Resolved terminal:', foundTerminal.name, 'ObjectID:', foundTerminal._id)
    } catch (error) {
      console.error('Error loading terminal:', error)
      terminal.value = null
    }
  }

  const loadRoutes = async (targetDate?: Date) => {
    try {
      routesLoading.value = true
      const dateToUse = targetDate || new Date()
      
      // Use local date formatting to avoid timezone issues
      const year = dateToUse.getFullYear()
      const month = String(dateToUse.getMonth() + 1).padStart(2, '0')
      const day = String(dateToUse.getDate()).padStart(2, '0')
      const today = `${year}-${month}-${day}`

      // Ensure we have a resolved terminal ID
      if (!terminalId.value) {
        console.error('No terminal ID resolved yet')
        routes.value = []
        return
      }

      console.log('Loading routes for terminal:', terminalId.value, 'on date:', today, targetDate ? '(selected date)' : '(today)')

      // Load terminal's routes and show them all as dispatch candidates
      const terminalRoutesResponse = await feathersClient.service('routes').find({
        query: {
          terminalId: terminalId.value,
          $limit: 1000,
        },
      })

      terminalRoutes.value = terminalRoutesResponse.data || []
      console.log('Terminal routes found:', terminalRoutes.value.length)

      if (terminalRoutes.value.length === 0) {
        routes.value = []
        lastUpdated.value = new Date()
        return
      }

      const terminalRouteIds = terminalRoutes.value.map(route => route._id)
      console.log('Terminal route IDs:', terminalRouteIds)

      // Load any existing dispatched routes for today
      const dispatchedResponse = await feathersClient.service('dispatched-routes').find({
        query: {
          executionDate: today,
          routeId: { $in: terminalRouteIds },
          $limit: 1000,
          $sort: { plannedDepartureTime: 1 },
        },
      })

      const dispatchedRoutes = dispatchedResponse.data || []
      console.log('Dispatched routes found:', dispatchedRoutes.length)

      // Create dispatch entries for all terminal routes scheduled for today

      routes.value = terminalRoutes.value
        .filter(route => isRouteScheduledForToday(route, today, dateToUse))
        .map(route => {
          // If there's an existing dispatched route, use it
          const existingDispatch = dispatchedRoutes.find(dr => dr.routeId === route._id)
          if (existingDispatch) {
            return existingDispatch
          }

          // Otherwise create a dispatch entry from the route
          return {
            _id: `dispatch-${route._id}`,
            routeId: route._id,
            executionDate: today,
            status: 'planned',
            priority: 'normal',
            plannedDepartureTime: route.departureTime || '08:00',
            assignedDriverId: route.defaultDriverId || null,
            assignedTruckId: route.truckNumber || null,
            assignedSubUnitId: route.subUnitNumber || null,
            dispatchNotes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        })

      console.log('Final routes for display:', routes.value.length)

      await loadRelatedData()
      await loadRouteStopsForAllRoutes()
      lastUpdated.value = new Date()
    } catch (error) {
      console.error('Error loading routes:', error)
      routes.value = []
    } finally {
      routesLoading.value = false
    }
  }

  const loadRelatedData = async () => {
    try {
      const driverIds = new Set<string>()
      const equipmentIds = new Set<string>()

      for (const route of routes.value) {
        if (route.assignedDriverId) driverIds.add(route.assignedDriverId)
        if (route.assignedTruckId) equipmentIds.add(route.assignedTruckId)
        if (route.assignedSubUnitId) equipmentIds.add(route.assignedSubUnitId)
      }

      // Load drivers
      if (driverIds.size > 0) {
        const driversResponse = await feathersClient.service('drivers').find({
          query: { _id: { $in: Array.from(driverIds) }, $limit: driverIds.size },
        })

        const driversMap = new Map()
        driversResponse.data.forEach((driver: any) => {
          driversMap.set(driver._id, driver)
        })
        drivers.value = driversMap
      }

      // Load equipment
      if (equipmentIds.size > 0) {
        const equipmentResponse = await feathersClient.service('equipment').find({
          query: { _id: { $in: Array.from(equipmentIds) }, $limit: equipmentIds.size },
        })

        const equipmentMap = new Map()
        equipmentResponse.data.forEach((equip: any) => {
          equipmentMap.set(equip._id, equip)
        })
        equipment.value = equipmentMap
      }
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  const loadRouteStopsForAllRoutes = async () => {
    console.log('=== loadRouteStopsForAllRoutes STARTED ===')
    try {
      console.log('terminalRoutes.value:', terminalRoutes.value.length, 'routes')

      // Extract the _id values from terminal routes for route-stops lookup
      const terminalRouteIds = terminalRoutes.value.map(route => route._id).filter(Boolean)
      if (terminalRouteIds.length === 0) {
        console.log('No terminal routes to load stops for')
        return
      }

      console.log('Loading route stops for terminal routes:', terminalRouteIds)
      console.log('Terminal routes data:', terminalRoutes.value.map(r => ({ _id: r._id, trkid: r.trkid })))

      // Use getAllRecords approach like terminals/[id].vue to avoid ObjectId query issues
      const getAllRecords = async (service: any, query: any) => {
        const countResult = await service.find({ query: { ...query, $limit: 0 } })
        const total = countResult.total

        if (total === 0) return []

        const allRecords: any[] = []
        const limit = 1000
        let skip = 0

        while (skip < total) {
          const result = await service.find({
            query: { ...query, $limit: limit, $skip: skip, $sort: { routeId: 1, sequence: 1 } },
          })
          allRecords.push(...result.data)
          skip += limit
        }

        return allRecords
      }

      // Load all route stops and filter client-side
      const allStops = await getAllRecords(feathersClient.service('route-stops'), {})
      console.log('All route stops loaded:', allStops.length)

      // Filter stops for our terminal routes
      const terminalRouteIdsSet = new Set(terminalRouteIds)
      const stops = allStops.filter(stop => terminalRouteIdsSet.has(stop.routeId))

      console.log('Filtered stops for terminal routes:', stops.length)

      if (stops.length > 0) {
        console.log('Sample stop data:', stops[0])
        console.log('All stop routeIds:', stops.map(s => s.routeId))
      }

      // Group stops by routeId and sort by sequence
      const stopsMap = new Map<string, any[]>()
      for (const stop of stops) {
        const routeId = stop.routeId
        if (!stopsMap.has(routeId)) {
          stopsMap.set(routeId, [])
        }
        stopsMap.get(routeId)!.push(stop)
      }

      // Sort each route's stops by sequence
      for (const [routeId, routeStops] of stopsMap.entries()) {
        routeStops.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
      }

      routeStops.value = stopsMap
      console.log('Route stops grouped by route:', stopsMap.size, 'routes with stops')

      // Debug: Log first few route stops
      for (const [routeId, stops] of stopsMap.entries()) {
        console.log(`Route ${routeId}: ${stops.length} stops`)
        if (stops.length > 0) {
          console.log('  First stop:', stops[0].custName, 'Sequence:', stops[0].sequence)
        }
      }

      console.log('=== loadRouteStopsForAllRoutes COMPLETED ===')
    } catch (error) {
      console.error('Error loading route stops:', error)
      routeStops.value = new Map()
      console.log('=== loadRouteStopsForAllRoutes FAILED ===')
    }
  }

  const refreshData = async () => {
    refreshing.value = true
    try {
      await loadRoutes()

      // Load all related data in parallel
      await Promise.all([
        loadRouteStopsForAllRoutes(),
        loadTerminalDriversAndEquipment(),
        loadRouteSubstitutions(),
      ])
    } finally {
      refreshing.value = false
    }
  }

  const loadTerminalDriversAndEquipment = async () => {
    try {
      console.log('Loading drivers and equipment for terminal routes')

      // Collect all unique driver IDs from routes
      const driverIds = new Set<string>()
      const equipmentNumbers = new Set<string>()

      routes.value.forEach((route: any) => {
        if (route.assignedDriverId) {
          driverIds.add(route.assignedDriverId)
        }
        if (route.assignedTruckId) {
          equipmentNumbers.add(route.assignedTruckId)
        }
        if (route.assignedSubUnitId) {
          equipmentNumbers.add(route.assignedSubUnitId)
        }
      })

      console.log('Route equipment IDs found:', Array.from(equipmentNumbers))
      console.log('Routes with assignment info:', routes.value.map(r => ({
        routeId: r.routeId,
        assignedDriverId: r.assignedDriverId,
        assignedTruckId: r.assignedTruckId,
        assignedSubUnitId: r.assignedSubUnitId,
      })))

      // Load all drivers - since driver schema doesn't have terminalId, we load all and use what we need
      const driversMap = new Map()

      // Load all drivers for the assignment dialogs and default lookups
      const allDriversResponse = await feathersClient.service('drivers').find({
        query: { $limit: 1000 },
      })

      allDriversResponse.data.forEach((driver: any) => {
        driversMap.set(driver._id, driver)
      })

      drivers.value = driversMap
      console.log('Loaded drivers:', driversMap.size)

      // Load equipment by equipment numbers
      const equipmentMap = new Map()

      // Load all equipment - since equipment schema doesn't have terminalId, we load all and use what we need
      const allEquipmentResponse = await feathersClient.service('equipment').find({
        query: { $limit: 1000 },
      })

      allEquipmentResponse.data.forEach((equipmentItem: any) => {
        equipmentMap.set(equipmentItem._id, equipmentItem)
        if (equipmentItem.equipmentNumber) {
          equipmentMap.set(equipmentItem.equipmentNumber, equipmentItem)
        }
      })

      equipment.value = equipmentMap
      console.log('Loaded equipment:', equipmentMap.size)

      // Debug: Show sample equipment data
      const sampleEquipment = allEquipmentResponse.data.slice(0, 3)
      console.log('Sample equipment:', sampleEquipment.map(eq => ({
        _id: eq._id,
        equipmentNumber: eq.equipmentNumber,
        type: eq.type,
      })))

      // Debug: Show equipment map keys
      console.log('Equipment map keys (first 10):', Array.from(equipmentMap.keys()).slice(0, 10))
    } catch (error) {
      console.error('Error loading drivers and equipment:', error)
    }
  }

  const loadRouteSubstitutions = async () => {
    try {
      console.log('Loading route substitutions for dispatch')
      const routeIds = routes.value.map(route => route.routeId).filter(Boolean)
      if (routeIds.length === 0) return

      // For dispatch, we only need substitutions for today
      const today = new Date().toISOString().split('T')[0]

      const query: any = {
        routeId: { $in: routeIds },
        $limit: 1000,
        $or: [
          // No dates specified (ongoing substitution)
          { startDate: { $exists: false }, endDate: { $exists: false } },
          // No start date (immediate) and end date is today or after
          { startDate: { $exists: false }, endDate: { $gte: today } },
          // Start date is today or before and no end date (ongoing)
          { startDate: { $lte: today }, endDate: { $exists: false } },
          // Start date is today or before and end date is today or after
          { startDate: { $lte: today }, endDate: { $gte: today } },
        ],
      }

      const response = await feathersClient.service('route-substitution').find({ query })

      // Group substitutions by routeId
      const substitutionsMap = new Map()
      for (const substitution of response.data) {
        const routeId = substitution.routeId
        if (!substitutionsMap.has(routeId)) {
          substitutionsMap.set(routeId, [])
        }
        substitutionsMap.get(routeId).push(substitution)
      }

      routeSubstitutions.value = substitutionsMap
      console.log('Loaded route substitutions:', substitutionsMap.size, 'routes with substitutions')
    } catch (error) {
      console.error('Error loading route substitutions:', error)
      routeSubstitutions.value = new Map()
    }
  }

  // Helper function to check if a route is scheduled for today
  const isRouteScheduledForToday = (route: any, today: string, dateObj?: Date): boolean => {
    // Use the provided date object directly to avoid timezone parsing issues
    const todayDate = dateObj || new Date(today + 'T12:00:00')
    const dayOfWeek = todayDate.getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    console.log(`Date string: ${today}, Date object: ${todayDate}, Day of week: ${dayOfWeek} (${dayNames[dayOfWeek]})`)
    console.log(`Checking route ${route.trkid} for ${dayNames[dayOfWeek]}:`, {
      sun: route.sun,
      mon: route.mon,
      tue: route.tue,
      wed: route.wed,
      thu: route.thu,
      fri: route.fri,
      sat: route.sat,
    })

    let isScheduled = false
    switch (dayOfWeek) {
      case 0: { isScheduled = route.sun === true || route.sun === 1; break
      }
      case 1: { isScheduled = route.mon === true || route.mon === 1; break
      }
      case 2: { isScheduled = route.tue === true || route.tue === 1; break
      }
      case 3: { isScheduled = route.wed === true || route.wed === 1; break
      }
      case 4: { isScheduled = route.thu === true || route.thu === 1; break
      }
      case 5: { isScheduled = route.fri === true || route.fri === 1; break
      }
      case 6: { isScheduled = route.sat === true || route.sat === 1; break
      }
      default: { isScheduled = false
      }
    }

    console.log(`Route ${route.trkid} scheduled for ${dayNames[dayOfWeek]}:`, isScheduled)
    return isScheduled
  }

  // Route stops helper methods
  const getRouteStops = (routeId: string): any[] => {
    const stops = routeStops.value.get(routeId) || []

    // Add terminal stops at beginning and end like routes/[id].vue
    const stopsWithTerminal = []

    if (terminal.value && stops.length > 0) {
      // Sort regular stops by sequence first
      const sortedStops = [...stops].sort((a, b) => (a.sequence || 0) - (b.sequence || 0))

      // Find the dispatch route to get the departure time
      const dispatchRoute = routes.value.find(r => r.routeId === routeId)

      // Create terminal start stop (sequence 0)
      const terminalStartStop = {
        _id: 'terminal-start',
        sequence: 0,
        custName: terminal.value.name || 'Terminal',
        address: terminal.value.streetAddress || terminal.value.fullName || '',
        city: terminal.value.city || '',
        state: terminal.value.state || '',
        zipCode: terminal.value.zip || '',
        eta: '', // No ETA for starting terminal
        etd: dispatchRoute?.plannedDepartureTime || '', // Use planned departure time from dispatch route
        commitTime: '',
        openTime: '',
        closeTime: '',
        latitude: terminal.value.latitude,
        longitude: terminal.value.longitude,
        isTerminal: true,
        isStart: true,
      }
      stopsWithTerminal.push(terminalStartStop)

      // Add all regular stops
      stopsWithTerminal.push(...sortedStops)

      // Create terminal end stop (sequence = last stop + 1)
      const lastSequence = Math.max(...sortedStops.map(s => s.sequence || 0))
      const lastCustomerStop = sortedStops.at(-1)

      // Calculate estimated return time based on distance and 48 mph average speed
      let estimatedReturnETA = ''
      if (lastCustomerStop?.etd && terminal.value?.latitude && terminal.value?.longitude
        && lastCustomerStop?.latitude && lastCustomerStop?.longitude) {
        const returnDistance = calculateDistance(
          lastCustomerStop.latitude,
          lastCustomerStop.longitude,
          terminal.value.latitude,
          terminal.value.longitude,
        )
        const returnTimeMinutes = Math.round((returnDistance / 48) * 60) // Convert hours to minutes

        // Add return travel time to last stop's ETD
        const lastETDMinutes = timeToMinutes(lastCustomerStop.etd)
        const returnETAMinutes = lastETDMinutes + returnTimeMinutes

        // Convert back to time format, handling day rollover
        const hours = Math.floor(returnETAMinutes / 60) % 24
        const minutes = returnETAMinutes % 60
        estimatedReturnETA = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      }

      const terminalEndStop = {
        _id: 'terminal-end',
        sequence: lastSequence + 1,
        custName: terminal.value.name || 'Terminal',
        address: terminal.value.streetAddress || terminal.value.fullName || '',
        city: terminal.value.city || '',
        state: terminal.value.state || '',
        zipCode: terminal.value.zip || '',
        eta: estimatedReturnETA, // Estimated return time based on distance and speed
        etd: '', // No ETD for ending terminal
        commitTime: '',
        openTime: '',
        closeTime: '',
        latitude: terminal.value.latitude,
        longitude: terminal.value.longitude,
        isTerminal: true,
        isEnd: true,
      }
      stopsWithTerminal.push(terminalEndStop)

      return stopsWithTerminal
    } else {
      return stops
    }
  }

  const getStopColor = (stop: any, index: number): string => {
    if (stop?.isTerminal) {
      return stop.isStart ? 'green' : 'red'
    }
    // Alternate colors for better visual distinction
    const colors = ['primary', 'blue', 'indigo', 'purple', 'teal']
    return colors[index % colors.length]
  }

  // Truck positioning logic
  const getTruckPosition = (route: any): { position: string, stopIndex: number, status: string } => {
    const currentTime = new Date()
    const todayStr = currentTime.toTimeString().slice(0, 5) // HH:MM format

    // Get all stops including terminal stops
    const allStops = getRouteStops(route.routeId)
    // Filter to get only customer stops (not terminal stops) for time logic
    const customerStops = allStops.filter(stop => !stop.isTerminal)

    if (customerStops.length === 0) {
      return { position: 'terminal', stopIndex: 0, status: 'on-site' }
    }

    // Check if route hasn't started yet
    const startTime = route.plannedDepartureTime || customerStops[0]?.etd
    if (startTime && todayStr < startTime) {
      return { position: 'terminal', stopIndex: 0, status: 'on-site' }
    }

    // Find current position based on time using customer stops
    for (let i = 0; i < customerStops.length; i++) {
      const stop = customerStops[i]
      const nextStop = customerStops[i + 1]

      // Find the index of this customer stop in the full allStops array
      const fullStopIndex = allStops.findIndex(s => s._id === stop._id)

      // If we have an ETA and we're before it, truck is en-route to this stop
      if (stop.eta && todayStr < stop.eta) {
        return { position: 'en-route', stopIndex: fullStopIndex, status: 'en-route' }
      }

      // If we have an ETD and current time is between ETA and ETD, truck is at this stop
      if (stop.eta && stop.etd && todayStr >= stop.eta && todayStr <= stop.etd) {
        return { position: 'at-stop', stopIndex: fullStopIndex, status: 'at-stop' }
      }

      // If we have ETD and we're past it but before next stop's ETA, truck is en-route
      if (stop.etd && todayStr > stop.etd && nextStop?.eta && todayStr < nextStop.eta) {
        const nextFullStopIndex = allStops.findIndex(s => s._id === nextStop._id)
        return { position: 'en-route', stopIndex: nextFullStopIndex, status: 'en-route' }
      }
    }

    // If we've passed all customer stops, truck should be at the final terminal stop
    const lastCustomerStop = customerStops.at(-1)
    if (lastCustomerStop?.etd && todayStr > lastCustomerStop.etd) {
      // Point to the final terminal stop (last index in allStops)
      return { position: 'at-stop', stopIndex: allStops.length - 1, status: 'completed' }
    }

    // Default to on-site if we can't determine position
    return { position: 'terminal', stopIndex: 0, status: 'on-site' }
  }

  const shouldShowTruckAtStop = (route: any, stopIndex: number): boolean => {
    const truckPos = getTruckPosition(route)
    return truckPos.stopIndex === stopIndex && (truckPos.position === 'at-stop' || truckPos.position === 'terminal')
  }

  // Helper methods
  const getRouteNumber = (routeId: string): string => {
    const route = terminalRoutes.value.find(r => r._id === routeId)
    return route?.trkid || routeId
  }

  // Helper functions to get assigned driver and equipment (with substitutions)
  const getAssignedDriver = (route: any): any => {
    const routeSubs = routeSubstitutions?.value?.get(route.routeId) || []

    // Check for driver substitution first
    const driverSubstitution = routeSubs.find(sub => sub.driverId)
    if (driverSubstitution?.driverId) {
      return drivers.value.get(driverSubstitution.driverId)
    }

    // Fall back to assigned driver from dispatch
    if (route.assignedDriverId) {
      return drivers.value.get(route.assignedDriverId)
    }

    return null
  }

  const getAssignedEquipment = (route: any): { truck: any, subUnit: any } => {
    const routeSubs = routeSubstitutions?.value?.get(route.routeId) || []

    // Check for truck substitution first
    const truckSubstitution = routeSubs.find(sub => sub.truckNumber)
    const subUnitSubstitution = routeSubs.find(sub => sub.subUnitNumber)

    // For dispatch routes, use assignedTruckId and assignedSubUnitId
    const truckId = truckSubstitution?.truckNumber || route.assignedTruckId
    const subUnitId = subUnitSubstitution?.subUnitNumber || route.assignedSubUnitId

    return {
      truck: truckId ? equipment.value.get(truckId) : null,
      subUnit: subUnitId ? equipment.value.get(subUnitId) : null,
    }
  }

  const getDriverName = (route: any): string => {
    const driver = getAssignedDriver(route)

    if (!driver) return 'Not Assigned'

    // Try different possible property names for driver names
    if (driver.fname && driver.lname) {
      return `${driver.fname} ${driver.lname}`
    } else if (driver.firstName && driver.lastName) {
      return `${driver.firstName} ${driver.lastName}`
    } else if (driver.name) {
      return driver.name
    } else {
      return 'Unknown Driver'
    }
  }

  const getTruckInfo = (route: any): string => {
    const { truck, subUnit } = getAssignedEquipment(route)
    const truckInfo = truck ? `Truck ${truck.equipmentNumber}` : 'No Truck'
    const subUnitInfo = subUnit ? ` / ${subUnit.equipmentNumber}` : ''
    return truckInfo + subUnitInfo
  }

  // Helper function to get GEOtab driver/truck from single trip match
  const getGeotabDriverTruck = (geotabMatch: any) => {
    if (!geotabMatch || !Array.isArray(geotabMatch) || geotabMatch.length !== 1) {
      return { geotabDriverName: null, geotabTruckNumber: null }
    }

    const trip = geotabMatch[0]
    const driverName = trip.driverName || trip.driverInfo?.driver || trip.driver?.name || null
    const truckNumber = trip.truckID || trip.deviceInfo?.truckID || trip.device?.name || null

    return {
      geotabDriverName: driverName,
      geotabTruckNumber: truckNumber,
    }
  }

  const getTerminalStatus = (): string => {
    if (routes.value.length === 0) return 'Idle'

    const urgentRoutes = routes.value.filter(route => route.priority === 'urgent')
    if (urgentRoutes.length > 0) return 'Alert'

    const activeRoutes = routes.value.filter(route =>
      route.status === 'in-transit' || route.status === 'dispatched',
    )
    if (activeRoutes.length > 0) return 'Active'

    return 'Scheduled'
  }

  const getTerminalStatusColor = (): string => {
    const status = getTerminalStatus()
    switch (status) {
      case 'Alert': { return 'red'
      }
      case 'Active': { return 'orange'
      }
      case 'Scheduled': { return 'blue'
      }
      case 'Idle': { return 'grey'
      }
      default: { return 'grey'
      }
    }
  }

  const getRouteCountByStatus = (statuses: string[]): number => {
    return routes.value.filter(route => statuses.includes(route.status)).length
  }

  const getRouteStatusColor = (status: string): string => {
    switch (status) {
      case 'planned': { return 'blue'
      }
      case 'assigned': { return 'indigo'
      }
      case 'dispatched': { return 'orange'
      }
      case 'in-transit': { return 'green'
      }
      case 'completed': { return 'success'
      }
      case 'delayed': { return 'warning'
      }
      case 'cancelled': { return 'error'
      }
      default: { return 'grey'
      }
    }
  }

  const getRouteStatusIcon = (status: string): string => {
    switch (status) {
      case 'planned': { return 'mdi-calendar'
      }
      case 'assigned': { return 'mdi-account-check'
      }
      case 'dispatched': { return 'mdi-send'
      }
      case 'in-transit': { return 'mdi-truck-fast'
      }
      case 'completed': { return 'mdi-check-circle'
      }
      case 'delayed': { return 'mdi-clock-alert'
      }
      case 'cancelled': { return 'mdi-cancel'
      }
      default: { return 'mdi-help-circle'
      }
    }
  }

  const formatStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')
  }

  const formatPriority = (priority: string): string => {
    return priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Normal'
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': { return 'red'
      }
      case 'high': { return 'orange'
      }
      case 'normal': { return 'blue'
      }
      default: { return 'grey'
      }
    }
  }

  const formatDepartureTime = (time: string): string => {
    if (!time) return 'Not set'

    try {
      const [hours, minutes] = time.split(':')
      const hour24 = Number.parseInt(hours)
      const hour12 = hour24 === 0 ? 12 : (hour24 > 12 ? hour24 - 12 : hour24)
      const ampm = hour24 >= 12 ? 'PM' : 'AM'
      return `${hour12}:${minutes} ${ampm}`
    } catch {
      return time
    }
  }

  const getDepartureTimeColor = (route: any): string => {
    if (!route.plannedDepartureTime) return 'grey'

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const departureTime = new Date(`${today} ${route.plannedDepartureTime}`)
    const timeDiff = departureTime.getTime() - now.getTime()
    const minutesDiff = timeDiff / (1000 * 60)

    if (minutesDiff < -30) return 'red' // Past due
    if (minutesDiff < 30) return 'orange' // Due soon
    return 'green' // On time
  }

  const getDepartureTimeClass = (route: any): string => {
    const color = getDepartureTimeColor(route)
    switch (color) {
      case 'red': { return 'text-error font-weight-bold'
      }
      case 'orange': { return 'text-warning font-weight-bold'
      }
      default: { return ''
      }
    }
  }

  const getRouteProgress = (route: any): number => {
    // Mock progress calculation - in real implementation, this would be based on actual tracking
    switch (route.status) {
      case 'planned': { return 0
      }
      case 'assigned': { return 15
      }
      case 'dispatched': { return 25
      }
      case 'in-transit': { return 60
      }
      case 'completed': { return 100
      }
      case 'cancelled': { return 0
      }
      default: { return 0
      }
    }
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString()
  }

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Get distance between consecutive stops
  const getDistanceBetweenStops = (routeId: string, fromIndex: number, toIndex: number): number => {
    const stops = getRouteStops(routeId)

    if (fromIndex >= stops.length || toIndex >= stops.length) return 0

    const fromStop = stops[fromIndex]
    const toStop = stops[toIndex]

    if (!fromStop.latitude || !fromStop.longitude || !toStop.latitude || !toStop.longitude) {
      return 0
    }

    return calculateDistance(fromStop.latitude, fromStop.longitude, toStop.latitude, toStop.longitude)
  }

  // Convert time string to minutes for calculation
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr || typeof timeStr !== 'string') return 0

    try {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    } catch {
      return 0
    }
  }

  // Get duration between consecutive stops
  const getDurationBetweenStops = (routeId: string, fromIndex: number, toIndex: number): number => {
    const stops = getRouteStops(routeId)

    if (fromIndex >= stops.length || toIndex >= stops.length) return 0

    const fromStop = stops[fromIndex]
    const toStop = stops[toIndex]

    // Use ETD of previous stop and ETA of current stop
    const fromETD = fromStop.etd
    const toETA = toStop.eta

    if (!fromETD || !toETA) return 0

    const fromMinutes = timeToMinutes(fromETD)
    const toMinutes = timeToMinutes(toETA)

    // Handle day rollover (if toMinutes < fromMinutes, assume next day)
    let duration = toMinutes - fromMinutes
    if (duration < 0) {
      duration += 24 * 60 // Add 24 hours
    }

    return duration
  }

  // Format distance for display
  const formatDistance = (distance: number): string => {
    if (distance === 0) return 'N/A'
    return distance.toFixed(1)
  }

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return 'N/A'

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  // Calculate total distance for all stops in a route
  const getTotalDistance = (routeId: string): number => {
    const stops = getRouteStops(routeId)
    let total = 0

    for (let i = 1; i < stops.length; i++) {
      total += getDistanceBetweenStops(routeId, i - 1, i)
    }

    return total
  }

  // Calculate total duration for all stops in a route
  const getTotalDuration = (routeId: string): number => {
    const stops = getRouteStops(routeId)
    let total = 0

    for (let i = 1; i < stops.length; i++) {
      total += getDurationBetweenStops(routeId, i - 1, i)
    }

    return total
  }

  // Timeline dialog methods
  const openTimelineDialog = (route: any) => {
    timelineDialog.value.route = route
    timelineDialog.value.show = true
  }

  // Note types
  const noteTypes = [
    'General',
    'Dispatch',
    'Driver',
    'Management',
    'Customer',
    'Route',
    'Delay',
    'Issue',
  ]

  // Late reasons
  const lateReasons = [
    'Traffic congestion',
    'Vehicle breakdown',
    'Loading/unloading delays',
    'Customer unavailable',
    'Weather conditions',
    'Route detour required',
    'Driver break/rest period',
    'Fuel stop required',
    'Equipment malfunction',
    'Dispatch instruction delay',
    'Warehouse delay',
    'Customer request',
    'Emergency situation',
    'Other',
  ]

  // Notes methods
  const openNotesDialog = (route: any, stop: any) => {
    notesDialog.value.route = route
    notesDialog.value.stop = stop
    notesDialog.value.show = true
  }

  const getStopNotes = (route: any, stop: any): any[] => {
    const key = `${route._id}-${stop._id || stop.sequence}`
    return routeNotes.value.get(key) || []
  }

  const getCurrentStopNotes = (): any[] => {
    if (!notesDialog.value.route || !notesDialog.value.stop) return []
    return getStopNotes(notesDialog.value.route, notesDialog.value.stop)
  }

  const addNote = () => {
    if (!newNote.value.content.trim() || !notesDialog.value.route || !notesDialog.value.stop) return

    const key = `${notesDialog.value.route._id}-${notesDialog.value.stop._id || notesDialog.value.stop.sequence}`
    const existingNotes = routeNotes.value.get(key) || []

    const note = {
      content: newNote.value.content.trim(),
      type: newNote.value.type,
      timestamp: new Date().toISOString(),
      author: 'Dispatcher', // In real app, get from auth
    }

    existingNotes.push(note)
    routeNotes.value.set(key, existingNotes)

    // Clear form
    newNote.value.content = ''
    newNote.value.type = 'General'
  }

  const getNoteTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      General: 'blue',
      Dispatch: 'purple',
      Driver: 'green',
      Management: 'red',
      Customer: 'orange',
      Route: 'teal',
      Delay: 'warning',
      Issue: 'error',
    }
    return colors[type] || 'grey'
  }

  // Contact customer method
  const contactCustomer = (route: any, stop: any) => {
    communicationDialog.value = {
      show: true,
      route: route,
      stop: stop,
    }
  }

  // Communication methods
  const getCommunicationMethods = () => [
    'Phone',
    'Email',
    'Text/SMS',
    'In-Person',
    'Voicemail',
    'Other',
  ]

  const getCustomerCommunications = (route: any, stop: any): any[] => {
    const key = `${route._id}-${stop._id || stop.sequence}`
    return customerCommunications.value.get(key) || []
  }

  const addCommunication = () => {
    if (!newCommunication.value.message.trim() || !communicationDialog.value.route || !communicationDialog.value.stop) return

    const key = `${communicationDialog.value.route._id}-${communicationDialog.value.stop._id || communicationDialog.value.stop.sequence}`
    const existingComms = customerCommunications.value.get(key) || []

    const communication = {
      method: newCommunication.value.method,
      message: newCommunication.value.message.trim(),
      feedback: newCommunication.value.feedback.trim(),
      escalated: newCommunication.value.escalated,
      escalationReason: newCommunication.value.escalationReason.trim(),
      timestamp: new Date().toISOString(),
      dispatcher: 'Current Dispatcher', // In real app, get from auth
    }

    existingComms.push(communication)
    customerCommunications.value.set(key, existingComms)

    // Clear form
    newCommunication.value = {
      method: 'Phone',
      message: '',
      feedback: '',
      escalated: false,
      escalationReason: '',
    }
  }

  const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
      'Phone': 'green',
      'Email': 'blue',
      'Text/SMS': 'purple',
      'In-Person': 'orange',
      'Voicemail': 'yellow',
      'Other': 'grey',
    }
    return colors[method] || 'grey'
  }

  // Get customer page URL
  const getCustomerPageUrl = (stop: any): string => {
    // In a real implementation, this would generate the correct URL to the customer page
    // Options could include:
    // 1. Use customer ID: `/customers/${stop.cid}`
    // 2. Use Lanter ID: `/customers/lanter/${stop.lanterID}`
    // 3. Use customer PDC: `/customers/pdc/${stop.customerPDC}`

    if (stop.cid) {
      return `/customers/${stop.cid}`
    } else if (stop.lanterID) {
      return `/customers/lanter/${stop.lanterID}`
    } else if (stop.customerPDC) {
      return `/customers/pdc/${stop.customerPDC}`
    } else {
      // Fallback - search by name
      return `/customers?search=${encodeURIComponent(stop.custName || '')}`
    }
  }

  // Actual times methods
  const getActualTime = (route: any, stop: any, timeType: 'ata' | 'atd'): string => {
    const key = `${route._id}-${stop._id || stop.sequence}`
    const times = actualTimes.value.get(key)
    return times?.[timeType] || ''
  }

  const updateActualTime = (route: any, stop: any, timeType: 'ata' | 'atd', value: string) => {
    const key = `${route._id}-${stop._id || stop.sequence}`
    const existingTimes = actualTimes.value.get(key) || {}

    existingTimes[timeType] = value
    actualTimes.value.set(key, existingTimes)

    // Late detection - require note if 15+ minutes late vs original expected time
    const expectedTime = timeType === 'ata' ? stop.eta : stop.etd
    if (value && expectedTime) {
      const stopIndex = getRouteStops(route.routeId).findIndex(s =>
        (s._id === stop._id) || (s.sequence === stop.sequence),
      )

      // Calculate how late they are relative to the original expected time
      const lateMinutesVsOriginal = timeToMinutes(value) - timeToMinutes(expectedTime)

      // If they're 15+ minutes late vs original time, require a note
      if (lateMinutesVsOriginal >= 15) {
        // Get cascading delay info for context in the dialog
        const cascadingOffset = getCumulativeTimeOffset(route, stopIndex)
        const adjustedExpectedMinutes = timeToMinutes(expectedTime) + cascadingOffset
        const lateMinutesVsAdjusted = timeToMinutes(value) - adjustedExpectedMinutes

        // Show late reason dialog
        lateReasonDialog.value = {
          show: true,
          route,
          stop,
          timeType,
          reason: '',
          notes: '',
          additionalDelay: lateMinutesVsAdjusted,
          cascadingDelay: cascadingOffset,
        }
      }
    }
  }

  const isTimeLate = (expectedTime: string, actualTime: string, minutesThreshold: number): boolean => {
    if (!expectedTime || !actualTime) return false

    const expectedMinutes = timeToMinutes(expectedTime)
    const actualMinutes = timeToMinutes(actualTime)

    return (actualMinutes - expectedMinutes) > minutesThreshold
  }

  const saveLateReason = () => {
    if (!lateReasonDialog.value.reason) return

    // Add late reason as a note
    const key = `${lateReasonDialog.value.route._id}-${lateReasonDialog.value.stop._id || lateReasonDialog.value.stop.sequence}`
    const existingNotes = routeNotes.value.get(key) || []

    const reasonNote = {
      content: `Late ${lateReasonDialog.value.timeType.toUpperCase()}: ${lateReasonDialog.value.reason}${lateReasonDialog.value.notes ? '. ' + lateReasonDialog.value.notes : ''}`,
      type: 'Delay',
      timestamp: new Date().toISOString(),
      author: 'System',
    }

    existingNotes.push(reasonNote)
    routeNotes.value.set(key, existingNotes)

    lateReasonDialog.value.show = false
  }

  const formatDateTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString()
  }

  // Time input methods
  const getTimeInputValue = (route: any, stop: any, timeType: 'ata' | 'atd', expectedTime: string): string => {
    // Get actual time if it exists
    const actualTime = getActualTime(route, stop, timeType)
    if (actualTime) {
      return convertTo24Hour(actualTime)
    }

    // If no actual time, use expected time
    if (expectedTime) {
      return convertTo24Hour(expectedTime)
    }

    // Return empty string if no time available
    return ''
  }

  const updateTimeFromInput = (route: any, stop: any, timeType: 'ata' | 'atd', event: Event) => {
    const target = event.target as HTMLInputElement
    const value = target.value
    if (!value) return

    // Convert 24-hour format to 12-hour format for display
    const displayTime = convertTo12Hour(value)
    updateActualTime(route, stop, timeType, displayTime)
  }

  const convertTo24Hour = (time12h: string): string => {
    if (!time12h) return ''

    try {
      const [time, modifier] = time12h.split(' ')
      let [hours, minutes] = time.split(':')

      if (hours === '12') {
        hours = '00'
      }

      if (modifier?.toLowerCase() === 'pm') {
        hours = (Number.parseInt(hours, 10) + 12).toString()
      }

      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
    } catch {
      return time12h // Return original if conversion fails
    }
  }

  const convertTo12Hour = (time24h: string): string => {
    if (!time24h) return ''

    try {
      const [hours, minutes] = time24h.split(':')
      const hour24 = Number.parseInt(hours, 10)
      const hour12 = hour24 === 0 ? 12 : (hour24 > 12 ? hour24 - 12 : hour24)
      const ampm = hour24 >= 12 ? 'PM' : 'AM'

      return `${hour12}:${minutes} ${ampm}`
    } catch {
      return time24h // Return original if conversion fails
    }
  }

  // Time picker methods
  const getDisplayTime = (route: any, stop: any, timeType: 'ata' | 'atd', expectedTime: string): string => {
    const actualTime = getActualTime(route, stop, timeType)
    if (actualTime) {
      return actualTime
    }
    // Show --:-- if no actual time has been set by user
    return '--:--'
  }

  const getTimePickerValue = (route: any, stop: any, timeType: 'ata' | 'atd', expectedTime: string): string => {
    // Check for temporary value first (while picker is open)
    const tempKey = `${route._id}-${stop._id || stop.sequence}-${timeType}`
    const tempValue = tempTimePickerValues.value[tempKey]
    if (tempValue) {
      return tempValue
    }

    // Check for actual time (user has saved a time)
    const actualTime = getActualTime(route, stop, timeType)
    if (actualTime) {
      return actualTime
    }

    // Fall back to expected time for initial picker value
    return expectedTime || ''
  }

  const updateTimeFromPicker = (route: any, stop: any, timeType: 'ata' | 'atd', value: string) => {
    if (!value) return

    // Store the value temporarily (don't update actual time yet)
    const tempKey = `${route._id}-${stop._id || stop.sequence}-${timeType}`
    tempTimePickerValues.value[tempKey] = value
  }

  // Check if a time has been manually updated by the user
  const isTimeUpdated = (route: any, stop: any, timeType: 'ata' | 'atd'): boolean => {
    const actualTime = getActualTime(route, stop, timeType)
    return !!actualTime // Returns true if user has set an actual time
  }

  // Confirm time selection and close menu
  const confirmTimeSelection = (route: any, stop: any, timeType: 'ata' | 'atd') => {
    const tempKey = `${route._id}-${stop._id || stop.sequence}-${timeType}`
    const tempValue = tempTimePickerValues.value[tempKey]

    if (tempValue) {
      updateActualTime(route, stop, timeType, tempValue)
    }

    // Clean up temp value
    delete tempTimePickerValues.value[tempKey]

    // Close the menu
    const menuKey = `${route._id}-${stop._id || stop.sequence}-${timeType}`
    timePickerMenus.value[menuKey] = false
  }

  // Cancel time selection and close menu
  const cancelTimeSelection = (route: any, stop: any, timeType: 'ata' | 'atd') => {
    const tempKey = `${route._id}-${stop._id || stop.sequence}-${timeType}`

    // Clean up temp value
    delete tempTimePickerValues.value[tempKey]

    // Close the menu
    const menuKey = `${route._id}-${stop._id || stop.sequence}-${timeType}`
    timePickerMenus.value[menuKey] = false
  }

  // Cascading time calculation methods
  const getCumulativeTimeOffset = (route: any, upToStopIndex: number): number => {
    const stops = getRouteStops(route.routeId)
    let runningOffset = 0

    // Find the most recent actual time to determine current offset
    for (let i = 0; i < upToStopIndex && i < stops.length; i++) {
      const stop = stops[i]

      const actualATD = getActualTime(route, stop, 'atd')
      const actualATA = getActualTime(route, stop, 'ata')

      // Priority 1: If we have a departure time, that's the most recent reference point
      if (actualATD && stop.etd) {
        const actualMinutes = timeToMinutes(actualATD)
        const expectedMinutes = timeToMinutes(stop.etd)
        runningOffset = actualMinutes - expectedMinutes
      }
      // Priority 2: If no departure but we have arrival, use that
      else if (actualATA && stop.eta) {
        const actualMinutes = timeToMinutes(actualATA)
        const expectedMinutes = timeToMinutes(stop.eta)

        // If we already had an offset from previous stops, we need to add this difference
        const arrivalOffset = actualMinutes - expectedMinutes

        // If this is the first actual time we've seen, use it as the baseline
        // Otherwise, this arrival time already includes any previous delays
        runningOffset = arrivalOffset
      }
    }

    return runningOffset
  }

  const getCalculatedTimeOffset = (route: any, stop: any, stopIndex: number, timeType: 'eta' | 'etd'): number => {
    // Only calculate offsets for future stops, not current/past ones with actual times
    const actualTime = getActualTime(route, stop, timeType === 'eta' ? 'ata' : 'atd')
    if (actualTime) return 0 // Already has actual time, no offset needed

    const baseOffset = getCumulativeTimeOffset(route, stopIndex)

    // For ETD calculations, we need to account for the constraint that departure cannot be before arrival
    if (timeType === 'etd') {
      const actualATA = getActualTime(route, stop, 'ata')
      if (actualATA && stop.eta && stop.etd) {
        const actualArrivalMinutes = timeToMinutes(actualATA)
        const originalETAMinutes = timeToMinutes(stop.eta)
        const originalETDMinutes = timeToMinutes(stop.etd)

        // Calculate planned dwell time
        const plannedDwellTime = originalETDMinutes - originalETAMinutes

        // Calculate what ETD should be based on actual arrival + dwell time
        const minimumETDMinutes = actualArrivalMinutes + plannedDwellTime

        // Calculate what ETD would be with just the cascading offset
        const offsetETDMinutes = originalETDMinutes + baseOffset

        // If the minimum ETD (based on actual arrival) is greater than offset ETD,
        // we need a larger offset to account for the arrival delay
        if (minimumETDMinutes > offsetETDMinutes) {
          return minimumETDMinutes - originalETDMinutes
        }
      }
    }

    return baseOffset
  }

  const getCalculatedETA = (route: any, stop: any, stopIndex: number): string => {
    const offset = getCalculatedTimeOffset(route, stop, stopIndex, 'eta')
    if (offset === 0 || !stop.eta) return stop.eta || ''

    const originalMinutes = timeToMinutes(stop.eta)
    const adjustedMinutes = originalMinutes + offset

    // Handle day rollover
    const finalMinutes = adjustedMinutes >= 0 ? adjustedMinutes : adjustedMinutes + (24 * 60)
    const hours = Math.floor(finalMinutes / 60) % 24
    const mins = finalMinutes % 60

    // Convert back to 12-hour format like original times
    const hour12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours)
    const ampm = hours >= 12 ? 'PM' : 'AM'

    return `${hour12}:${mins.toString().padStart(2, '0')} ${ampm}`
  }

  const getCalculatedETD = (route: any, stop: any, stopIndex: number): string => {
    const offset = getCalculatedTimeOffset(route, stop, stopIndex, 'etd')
    if (!stop.etd) return ''

    // Start with the offset-adjusted ETD
    const originalETDMinutes = timeToMinutes(stop.etd)
    let adjustedETDMinutes = originalETDMinutes + offset

    // Check if we have an actual arrival time for this stop that affects departure
    const actualATA = getActualTime(route, stop, 'ata')
    if (actualATA && stop.eta && stop.etd) {
      const actualArrivalMinutes = timeToMinutes(actualATA)
      const originalETAMinutes = timeToMinutes(stop.eta)

      // Calculate the original planned dwell time (ETD - ETA)
      const plannedDwellTime = originalETDMinutes - originalETAMinutes

      // Ensure departure is at least the dwell time after actual arrival
      const minimumETDMinutes = actualArrivalMinutes + plannedDwellTime

      // Use whichever is later: the offset-adjusted ETD or the minimum ETD based on actual arrival
      adjustedETDMinutes = Math.max(adjustedETDMinutes, minimumETDMinutes)
    }

    // Only show adjusted time if it's different from original
    if (adjustedETDMinutes === originalETDMinutes && offset === 0) {
      return stop.etd
    }

    // Handle day rollover
    const finalMinutes = adjustedETDMinutes >= 0 ? adjustedETDMinutes : adjustedETDMinutes + (24 * 60)
    const hours = Math.floor(finalMinutes / 60) % 24
    const mins = finalMinutes % 60

    // Convert back to 12-hour format like original times
    const hour12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours)
    const ampm = hours >= 12 ? 'PM' : 'AM'

    return `${hour12}:${mins.toString().padStart(2, '0')} ${ampm}`
  }

  const formatTimeOffset = (offsetMinutes: number): string => {
    if (offsetMinutes === 0) return ''

    const absOffset = Math.abs(offsetMinutes)
    const hours = Math.floor(absOffset / 60)
    const mins = absOffset % 60

    let result = ''
    if (hours > 0) {
      result += `${hours}h `
    }
    if (mins > 0) {
      result += `${mins}m`
    }

    return offsetMinutes > 0 ? `+${result.trim()}` : `-${result.trim()}`
  }

  const getOffsetClass = (offsetMinutes: number): string => {
    if (offsetMinutes > 0) return 'text-red' // Late
    if (offsetMinutes < 0) return 'text-green' // Early
    return ''
  }

  // Action methods

  const markAsCompleted = async (route: any) => {
    try {
      await feathersClient.service('dispatched-routes').patch(route._id, {
        status: 'completed',
      })
      await refreshData()
    } catch (error) {
      console.error('Error marking route as completed:', error)
    }
  }

  const markAsDelayed = async (route: any) => {
    try {
      await feathersClient.service('dispatched-routes').patch(route._id, {
        status: 'delayed',
      })
      await refreshData()
    } catch (error) {
      console.error('Error marking route as delayed:', error)
    }
  }

  const cancelRoute = async (route: any) => {
    try {
      await feathersClient.service('dispatched-routes').patch(route._id, {
        status: 'cancelled',
      })
      await refreshData()
    } catch (error) {
      console.error('Error cancelling route:', error)
    }
  }

  // Auto-refresh setup
  let refreshInterval: number | null = null

  const startAutoRefresh = () => {
    if (refreshInterval) clearInterval(refreshInterval)
    if (autoRefresh.value) {
      refreshInterval = setInterval(() => {
        refreshData()
      }, 30_000) // Refresh every 30 seconds
    }
  }

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  // Helper function to update URL with new date
  const updateUrlWithDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    // Update the URL without triggering a page reload
    const newQuery = { ...route.query, date: dateString }
    router.replace({ query: newQuery })
    
    console.log('Updated URL with date:', dateString)
  }

  // Date navigation methods
  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate.value)
    previousDay.setDate(previousDay.getDate() - 1)
    selectedDate.value = previousDay
    updateUrlWithDate(selectedDate.value)
    onDateChanged()
  }

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate.value)
    nextDay.setDate(nextDay.getDate() + 1)
    selectedDate.value = nextDay
    updateUrlWithDate(selectedDate.value)
    onDateChanged()
  }

  const onDateSelected = (date: Date) => {
    datePickerMenu.value = false
    selectedDate.value = date
    updateUrlWithDate(selectedDate.value)
    onDateChanged()
  }

  // GeoTab trip data sync functionality
  const syncWithGeotab = async () => {
    if (!selectedDate.value) {
      console.error('No date selected for GeoTab sync')
      return
    }

    tripDataLoading.value = true
    try {
      console.log('Syncing with GeoTab for date:', selectedDate.value.toLocaleDateString())
      
      // Get authentication data from localStorage (same as geotab.vue)
      const stored = JSON.parse(localStorage.getItem('geotabStatus') || '{}')
      console.log('Stored geotab status:', stored)
      
      if (!stored.database || !stored.username || !stored.isAuthenticated) {
        throw new Error('Please authenticate with Geotab first. Visit the Geotab page to authenticate.')
      }

      // Format the selected date for the API call
      const year = selectedDate.value.getFullYear()
      const month = String(selectedDate.value.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.value.getDate()).padStart(2, '0')
      const fromDate = `${year}-${month}-${day}T00:00:00.000Z`

      // Calculate toDate for single-day search optimization
      let toDate: string | undefined
      const today = new Date()
      const isToday = selectedDate.value.toDateString() === today.toDateString()
      
      if (!isToday) {
        // If not today, limit search to the next day for better performance
        const nextDay = new Date(selectedDate.value)
        nextDay.setDate(nextDay.getDate() + 1)
        const nextYear = nextDay.getFullYear()
        const nextMonth = String(nextDay.getMonth() + 1).padStart(2, '0')
        const nextDayNum = String(nextDay.getDate()).padStart(2, '0')
        toDate = `${nextYear}-${nextMonth}-${nextDayNum}T00:00:00.000Z`
      }
      // If today, leave toDate undefined for open-ended search to get real-time data

      // Get trip data from geotab service
      const geotabService = feathersClient.service('geotab')
      const authStatus = await geotabService.getMemoryAuthStatus()
      console.log('Backend auth status:', authStatus)

      const authData = {
        database: stored.database,
        username: stored.username,
        password: 'from_memory' // Use stored password from backend memory
      }

      console.log(`Fetching trip data from: ${fromDate}${toDate ? ` to: ${toDate}` : ' (open-ended)'}`)
      const requestData: any = { fromDate, authData }
      if (toDate) {
        requestData.toDate = toDate
      }
      
      const response = await geotabService.getTripData(requestData)
      
      tripData.value = response.trips || []
      console.log(`Loaded ${tripData.value.length} trip records from GeoTab`)
      
      // Perform route-trip matching
      // matchRoutesWithTripData()
      
      // Perform stop-level trip matching for table view
      matchTripsToStops()

    } catch (error: any) {
      console.error('Error syncing with GeoTab:', error)
      // You might want to show a toast notification here
      alert(`Failed to sync with GeoTab: ${error.message}`)
    } finally {
      tripDataLoading.value = false
    }
  }

  const matchRoutesWithTripData = () => {
    console.log('Matching routes with trip data based on location only...')
    const matches = new Map<string, boolean>()
    
    // Reset all matches
    for (const route of routes.value) {
      matches.set(route._id || route.routeId, false)
    }

    // For each route, check if any trip data is within 0.1 miles of any stop
    for (const route of routes.value) {
      const routeId = route._id || route.routeId
      const stops = getRouteStops(routeId)
      let routeHasMatch = false
      
      // Check each stop in the route
      for (const stop of stops) {
        if (!stop.latitude || !stop.longitude) continue
        
        const stopLat = Number(stop.latitude)
        const stopLon = Number(stop.longitude)
        
        // Check if any trip data is within 0.1 miles of this stop
        for (const trip of tripData.value) {
          if (!trip.stopPoint?.x || !trip.stopPoint?.y) continue
          
          const tripLat = Number(trip.stopPoint.y)
          const tripLon = Number(trip.stopPoint.x)
          
          const distance = calculateDistance(stopLat, stopLon, tripLat, tripLon)
          
          if (distance <= 0.1) {
            routeHasMatch = true
            break
          }
        }
        
        if (routeHasMatch) break
      }
      
      if (routeHasMatch) {
        matches.set(routeId, true)
        console.log(`Route ${route.trkid} matched with trip data within 0.1 miles`)
      }
    }
    
    routeTripMatches.value = matches
    console.log(`Matched ${Array.from(matches.values()).filter(Boolean).length} out of ${routes.value.length} routes based on location`)
  }

  // Helper functions to extract driver and truck info from routes
  const getRouteDriverName = (route: any): string => {
    if (route.assignedDriverId && drivers.value.has(route.assignedDriverId)) {
      const driver = drivers.value.get(route.assignedDriverId)
      return `${driver.firstName || ''} ${driver.lastName || ''}`.trim()
    }
    return route.driverName || ''
  }


  // Color coding for trip data matches
  const getTripMatchColor = (route: any, type: 'driver' | 'truck'): string => {
    if (!tripData.value.length) {
      return 'primary' // Default color if no trip data loaded
    }
    
    const routeId = route._id || route.routeId
    const hasMatch = routeTripMatches.value.get(routeId)
    
    return hasMatch ? 'success' : 'warning' // Green for match, yellow/orange for no match
  }

  const getTripMatchTextClass = (route: any, type: 'driver' | 'truck'): string => {
    if (!tripData.value.length) {
      return '' // Default styling if no trip data loaded
    }
    
    const routeId = route._id || route.routeId
    const hasMatch = routeTripMatches.value.get(routeId)
    
    return hasMatch ? 'text-success' : 'text-warning' // Green text for match, yellow/orange for no match
  }

  // Helper functions for table view
  const getStopChipColor = (stopNumber: number, totalStops: number): string => {
    if (stopNumber === 0) return 'primary' // Terminal start
    if (stopNumber === totalStops) return 'secondary' // Terminal end
    return 'default' // Regular stops
  }

  const getStopDisplayNumber = (stopNumber: number, totalStops: number): string => {
    if (stopNumber === 0) return 'START'
    if (stopNumber === totalStops) return 'END'
    return stopNumber.toString()
  }

  const onDateChanged = async () => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayOfWeek = selectedDate.value.getDay()
    
    console.log('=== DATE CHANGED ===')
    console.log('Selected date object:', selectedDate.value)
    console.log('Day of week:', dayOfWeek, `(${dayNames[dayOfWeek]})`)
    console.log('Local date string:', selectedDate.value.toLocaleDateString())
    console.log('================')
    
    // Load routes for the selected date based on day of week
    try {
      await loadRoutes(selectedDate.value)
      
      // After routes are loaded, also reload related data
      if (routes.value.length > 0) {
        await Promise.all([
          loadTerminalDriversAndEquipment(),
          loadRouteSubstitutions(),
          loadRouteStopsForAllRoutes(),
        ])
      }
      
      console.log(`Loaded ${routes.value.length} routes for ${dayNames[dayOfWeek]}`)
    } catch (error) {
      console.error('Error loading data for selected date:', error)
    }
  }

  watch(autoRefresh, newValue => {
    if (newValue) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  })

  // Watch for URL changes (browser back/forward or direct URL changes)
  watch(() => route.query.date, (newDate: string | undefined) => {
    if (newDate) {
      const parsedDate = new Date(newDate + 'T12:00:00')
      if (!isNaN(parsedDate.getTime())) {
        // Only update if the date actually changed to avoid infinite loops
        const currentDateString = selectedDate.value.toISOString().split('T')[0]
        if (newDate !== currentDateString) {
          console.log('URL date changed, updating selected date:', newDate)
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

  // Lifecycle
  onMounted(async () => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    loading.value = true
    try {
      // Ensure URL has the date parameter if we have a selected date
      if (!route.query.date) {
        updateUrlWithDate(selectedDate.value)
      }

      // Load terminal details first to resolve URL ID to ObjectID
      await loadTerminalDetails()

      // Only proceed if terminal was found
      if (terminal.value) {
        // Load routes for the selected date (from URL or default)
        await loadRoutes(selectedDate.value)

        // Load drivers, equipment, substitutions, and route stops after routes are loaded
        await Promise.all([
          loadTerminalDriversAndEquipment(),
          loadRouteSubstitutions(),
          loadRouteStopsForAllRoutes(),
        ])

        // startAutoRefresh() // Disabled - manual refresh only
      }
    } finally {
      loading.value = false
    }
  })

  onUnmounted(() => {
    stopAutoRefresh()
  })

  // Table-specific helper functions
  const isTableTerminalStart = (item: any): boolean => {
    return item.stopId === 'start'
  }

  const isTableTerminalEnd = (item: any): boolean => {
    return item.stopId === 'end'
  }

  const getTableDisplayTime = (item: any, timeType: 'ata' | 'atd'): string => {
    const actualTime = getTableActualTime(item, timeType)
    if (actualTime) {
      return actualTime
    }
    // Show --:-- if no actual time has been set by user
    return '--:--'
  }

  const getTableDisplayTimeColor = (item: any, timeType: 'ata' | 'atd'): string => {
    const actualTime = getTableActualTime(item, timeType)
    return actualTime ? 'primary' : 'grey'
  }

  const isTableTimeUpdated = (item: any, timeType: 'ata' | 'atd'): boolean => {
    const actualTime = getTableActualTime(item, timeType)
    return !!actualTime // Returns true if user has set an actual time
  }

  const getTableActualTime = (item: any, timeType: 'ata' | 'atd'): string | null => {
    // Find the corresponding route and stop
    const route = routes.value.find(r => r.routeId === item.routeId)
    if (!route) return null

    if (item.stopId === 'start') {
      // Terminal start - use route level times
      return route.actualTimes?.[timeType] || null
    } else if (item.stopId === 'end') {
      // Terminal end - use route level times
      return route.actualTimes?.[timeType] || null
    } else {
      // Regular stop - find in route stops
      const stops = getRouteStops(item.routeId)
      const stop = stops.find(s => s._id === item.stopId)
      if (!stop) return null
      return getActualTime(route, stop, timeType)
    }
  }

  const getTableTimePickerValue = (item: any, timeType: 'ata' | 'atd'): string => {
    // Check for temporary value first (while picker is open)
    const tempKey = `${item.routeId}-${item.stopId}-${timeType}`
    const tempValue = tempTimePickerValues.value[tempKey]
    if (tempValue) {
      return tempValue
    }

    // Get actual time or expected time
    const actualTime = getTableActualTime(item, timeType)
    if (actualTime) {
      return actualTime
    }

    // Use expected time based on timeType
    const expectedTime = timeType === 'ata' ? item.expectedETA : item.expectedETD
    if (expectedTime && expectedTime !== 'N/A') {
      return expectedTime
    }

    // Default to current time
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }

  const updateTableTimeFromPicker = (item: any, timeType: 'ata' | 'atd', value: string) => {
    if (!value) return
    // Store the value temporarily (don't update actual time yet)
    const tempKey = `${item.routeId}-${item.stopId}-${timeType}`
    tempTimePickerValues.value[tempKey] = value
  }

  const confirmTableTimeSelection = (item: any, timeType: 'ata' | 'atd') => {
    const tempKey = `${item.routeId}-${item.stopId}-${timeType}`
    const tempValue = tempTimePickerValues.value[tempKey]
    if (tempValue) {
      updateTableActualTime(item, timeType, tempValue)
    }
    // Clean up temp value
    delete tempTimePickerValues.value[tempKey]
    // Close the menu
    const menuKey = `${item.routeId}-${item.stopId}-${timeType}`
    timePickerMenus.value[menuKey] = false
  }

  const cancelTableTimeSelection = (item: any, timeType: 'ata' | 'atd') => {
    const tempKey = `${item.routeId}-${item.stopId}-${timeType}`
    // Clean up temp value
    delete tempTimePickerValues.value[tempKey]
    // Close the menu
    const menuKey = `${item.routeId}-${item.stopId}-${timeType}`
    timePickerMenus.value[menuKey] = false
  }

  const updateTableActualTime = (item: any, timeType: 'ata' | 'atd', timeValue: string) => {
    // Find the corresponding route and stop
    const route = routes.value.find(r => r.routeId === item.routeId)
    if (!route) return

    if (item.stopId === 'start' || item.stopId === 'end') {
      // Terminal start/end - update route level times
      if (!route.actualTimes) {
        route.actualTimes = {}
      }
      route.actualTimes[timeType] = timeValue
    } else {
      // Regular stop - find in route stops and update
      const stops = getRouteStops(item.routeId)
      const stop = stops.find(s => s._id === item.stopId)
      if (stop) {
        updateActualTime(route, stop, timeType, timeValue)
      }
    }
  }

  // Table notes and contact helper functions
  const getTableStopNotes = (item: any): any[] => {
    // Find the corresponding route and stop
    const route = routes.value.find(r => r.routeId === item.routeId)
    if (!route) return []

    if (item.stopId === 'start' || item.stopId === 'end') {
      // For terminal start/end, create a pseudo stop object
      const pseudoStop = { _id: item.stopId, sequence: item.stopId }
      return getStopNotes(route, pseudoStop)
    } else {
      // Regular stop - find in route stops
      const stops = getRouteStops(item.routeId)
      const stop = stops.find(s => s._id === item.stopId)
      if (!stop) return []
      return getStopNotes(route, stop)
    }
  }

  const openTableNotesDialog = (item: any) => {
    // Find the corresponding route and stop
    const route = routes.value.find(r => r.routeId === item.routeId)
    if (!route) return

    if (item.stopId === 'start' || item.stopId === 'end') {
      // For terminal start/end, create a pseudo stop object
      const pseudoStop = { 
        _id: item.stopId, 
        sequence: item.stopId,
        custName: item.siteName,
        isTerminal: true,
        isStart: item.stopId === 'start',
        isEnd: item.stopId === 'end'
      }
      openNotesDialog(route, pseudoStop)
    } else {
      // Regular stop - find in route stops
      const stops = getRouteStops(item.routeId)
      const stop = stops.find(s => s._id === item.stopId)
      if (stop) {
        openNotesDialog(route, stop)
      }
    }
  }

  const contactTableCustomer = (item: any) => {
    // Only allow contact for non-terminal stops
    if (item.stopId === 'start' || item.stopId === 'end') return

    // Find the corresponding route and stop
    const route = routes.value.find(r => r.routeId === item.routeId)
    if (!route) return

    const stops = getRouteStops(item.routeId)
    const stop = stops.find(s => s._id === item.stopId)
    if (stop) {
      contactCustomer(route, stop)
    }
  }

  // Geotab helper functions
  const openGeotabDialog = (item: any) => {
    geotabDialog.value.item = item
    geotabDialog.value.show = true
  }

  // Convert time string to minutes for comparison
  const timeStringToMinutes = (timeStr: string): number => {
    if (!timeStr || timeStr === 'N/A') return -1
    
    try {
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        // 12-hour format
        const [time, period] = timeStr.split(' ')
        const [hours, minutes] = time.split(':').map(Number)
        let hour24 = hours
        if (period === 'PM' && hours !== 12) hour24 += 12
        if (period === 'AM' && hours === 12) hour24 = 0
        return hour24 * 60 + minutes
      } else {
        // 24-hour format or ISO string
        const date = new Date(timeStr)
        if (!isNaN(date.getTime())) {
          return date.getHours() * 60 + date.getMinutes()
        }
        // Simple HH:MM format
        const [hours, minutes] = timeStr.split(':').map(Number)
        return hours * 60 + minutes
      }
    } catch (error) {
      console.error('Error parsing time:', timeStr, error)
      return -1
    }
  }

  const matchTripsToStops = () => {
    if (!tripData.value.length) return
    
    console.log(`Starting location-based trip matching with ${tripData.value.length} trip records`)
    
    // Get the selected date for exact date filtering (no next day extension)
    const selectedDateStart = new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), selectedDate.value.getDate())
    const selectedDateEnd = new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), selectedDate.value.getDate(), 23, 59, 59, 999)

    console.log(`Filtering trips for exact date: ${selectedDateStart.toDateString()}`)
    
    // Get all table view items
    const tableItems = tableViewData.value

    for (const item of tableItems) {
      // Include all stops now (terminal start/end and regular stops)

      if (!item.latitude || !item.longitude) continue

      const stopLat = Number(item.latitude)
      const stopLon = Number(item.longitude)

      console.log(`Checking stop: ${item.siteName} at ${stopLat}, ${stopLon}`)

      // Find all trips within 0.1 miles (location-based only)
      const potentialMatches = []

      for (const trip of tripData.value) {
        if (!trip.stopPoint?.x || !trip.stopPoint?.y) continue

        // Date filtering - only include trips from the exact selected date
        if (trip.stop) {
          const tripDate = new Date(trip.stop)
          if (tripDate < selectedDateStart || tripDate > selectedDateEnd) {
            continue // Skip trips not from the selected date
          }

          // ETA time matching - trip.stop must be within 2 hours of the stop's ETA
          if (item.eta) {
            const etaTime = new Date(`${selectedDate.value.toDateString()} ${item.eta}`)
            const timeDiffMs = Math.abs(tripDate.getTime() - etaTime.getTime())
            const timeDiffHours = timeDiffMs / (1000 * 60 * 60)

            if (timeDiffHours > 2) {
              continue // Skip trips not within 2 hours of ETA
            }
          }
        }

        const tripLat = Number(trip.stopPoint.y)
        const tripLon = Number(trip.stopPoint.x)

        // Calculate distance
        const distance = calculateDistance(stopLat, stopLon, tripLat, tripLon)

        // Only include trips within 0.2 miles
        if (distance <= 0.2) {
          potentialMatches.push({
            ...trip,
            distance,
            stopName: item.siteName,
          })
        }
      }

      console.log(`Found ${potentialMatches.length} location matches for ${item.siteName} (within 0.2 miles)`)

      // Store all potential matches as an array
      item.geotabMatch = potentialMatches.length > 0 ? potentialMatches : null

      // If there's exactly one match, populate the GEOtab driver/truck fields
      const geotabInfo = getGeotabDriverTruck(potentialMatches.length > 0 ? potentialMatches : null)
      item.geotabDriverName = geotabInfo.geotabDriverName
      item.geotabTruckNumber = geotabInfo.geotabTruckNumber

      // If there's exactly one match, populate ATA and ATD from trip data
      if (potentialMatches.length === 1) {
        const trip = potentialMatches[0]
        
        // Set ATA from trip stop time
        if (trip.stop) {
          const stopTime = new Date(trip.stop)
          const ataTimeString = stopTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
          item.ata = ataTimeString
          
          // Also update the actualTimes storage for time pickers  
          // Find the corresponding route to update the correct storage
          const route = routes.value.find(r => r.routeId === item.routeId)
          if (route) {
            if (item.stopId === 'start' || item.stopId === 'end') {
              // Terminal stops use route-level actual times
              if (!route.actualTimes) route.actualTimes = {}
              route.actualTimes.ata = ataTimeString
            } else {
              // Regular stops use actualTimes Map
              const stops = getRouteStops(item.routeId)
              const stop = stops.find(s => s._id === item.stopId)
              if (stop) {
                const key = `${route._id}-${stop._id || stop.sequence}`
                const existingTimes = actualTimes.value.get(key) || {}
                existingTimes.ata = ataTimeString
                actualTimes.value.set(key, existingTimes)
              }
            }
          }
          
          console.log(`Auto-populated ATA for ${item.siteName}: ${ataTimeString}`)
        }
        
        // Set ATD from next trip start time  
        if (trip.nextTripStart) {
          const nextStartTime = new Date(trip.nextTripStart)
          const atdTimeString = nextStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
          item.atd = atdTimeString
          
          // Also update the actualTimes storage for time pickers
          // Find the corresponding route to update the correct storage
          const route = routes.value.find(r => r.routeId === item.routeId)
          if (route) {
            if (item.stopId === 'start' || item.stopId === 'end') {
              // Terminal stops use route-level actual times
              if (!route.actualTimes) route.actualTimes = {}
              route.actualTimes.atd = atdTimeString
            } else {
              // Regular stops use actualTimes Map
              const stops = getRouteStops(item.routeId)
              const stop = stops.find(s => s._id === item.stopId)
              if (stop) {
                const key = `${route._id}-${stop._id || stop.sequence}`
                const existingTimes = actualTimes.value.get(key) || {}
                existingTimes.atd = atdTimeString
                actualTimes.value.set(key, existingTimes)
              }
            }
          }
          
          console.log(`Auto-populated ATD for ${item.siteName}: ${atdTimeString}`)
        }
      }
    }
  }
</script>

<style scoped>
.route-card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.route-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.route-selected {
  border: 2px solid #1976d2;
  background-color: rgba(25, 118, 210, 0.04);
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Timeline Scroll Container */
.timeline-scroll-container {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 10px 0;
  margin: 0 -16px;
  padding-left: 16px;
  padding-right: 16px;
}

/* Custom scrollbar styling */
.timeline-scroll-container::-webkit-scrollbar {
  height: 6px;
}

.timeline-scroll-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.timeline-scroll-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.timeline-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Route Timeline Styling */
.route-timeline {
  padding: 15px 0;
  min-width: max-content;
}

/* Time Display Button Styling */
.time-display-btn {
  font-size: 0.75rem !important;
  min-width: 80px !important;
  height: 32px !important;
  padding: 0 8px !important;
}

.time-display-btn .v-btn__content {
  font-weight: 500;
}

/* Red underline for times that haven't been updated */
.time-not-updated {
  border-bottom: 2px solid #f44336 !important;
}

.time-not-updated .v-btn__content {
  color: #666 !important;
}

/* Time offset styling */
.text-xs {
  font-size: 0.6875rem;
  line-height: 1.2;
}

.text-red {
  color: #f44336;
  font-weight: 500;
}

.text-green {
  color: #4caf50;
  font-weight: 500;
}

/* Customer link styling */
.customer-link {
  color: #1976d2 !important;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.customer-link:hover {
  color: #1565c0 !important;
  text-decoration: underline;
}

.customer-link:visited {
  color: #7b1fa2 !important;
}

.route-timeline-dialog {
  padding: 20px 0;
  min-width: max-content;
}

.timeline-stop-card {
  max-width: 200px;
  min-width: 180px;
  transition: all 0.3s ease;
}

.timeline-stop-card-dialog {
  max-width: 280px;
  min-width: 240px;
  transition: all 0.3s ease;
}

.timeline-stop-card:hover,
.timeline-stop-card-dialog:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15) !important;
}

/* White text in timeline dots */
.white--text {
  color: white !important;
}

/* Responsive adjustments for timeline */
@media (max-width: 960px) {
  .timeline-stop-card {
    max-width: 160px;
    min-width: 140px;
  }
}

@media (max-width: 600px) {
  .timeline-stop-card {
    max-width: 140px;
    min-width: 120px;
  }

  .timeline-stop-card .v-card-text {
    padding: 8px !important;
  }

  .route-timeline {
    padding: 10px 0;
  }
}
</style>
