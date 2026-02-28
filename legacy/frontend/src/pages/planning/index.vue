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

    <!-- Main content -->
    <div v-if="!loading">
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col cols="12">
          <div class="d-flex align-center mb-4">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              @click="goBack"
            />
            <div class="ml-3">
              <h1 class="text-h4 mb-1">Route Planning</h1>
              <p class="text-body-1 text-grey-darken-1">
                Plan and schedule route executions
              </p>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Filters and Controls -->
      <v-row class="mb-6">
        <v-col cols="12" md="3">
          <v-select
            v-model="selectedTerminalId"
            clearable
            item-title="text"
            item-value="value"
            :items="terminalOptions"
            label="Terminal"
            @update:model-value="loadRoutes"
          />
        </v-col>

        <v-col cols="12" md="6">
          <!-- Placeholder for future filters -->
        </v-col>
      </v-row>

      <!-- Main Planning Grid -->
      <v-row>
        <!-- Routes Requiring Update Card -->
        <v-col cols="12">
          <v-card class="mb-4">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="warning" icon="mdi-alert-circle" />
                Routes Missing Assignments
                <v-chip
                  v-if="routesRequiringUpdate.length > 0"
                  class="ml-2"
                  color="warning"
                  size="small"
                >
                  {{ routesRequiringUpdate.length }}
                </v-chip>
              </div>
              <v-btn
                :icon="showRoutesRequiringUpdate ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                size="small"
                variant="text"
                @click="showRoutesRequiringUpdate = !showRoutesRequiringUpdate"
              />
            </v-card-title>

            <v-expand-transition>
              <div v-show="showRoutesRequiringUpdate">
                <v-divider />
                <v-card-text v-if="routesRequiringUpdate.length === 0" class="text-center py-8">
                  <v-icon class="mb-2" color="success" icon="mdi-check-circle" size="48" />
                  <p class="text-success font-weight-medium">All routes have complete assignments</p>
                  <p class="text-caption text-grey">No missing driver or truck assignments found</p>
                </v-card-text>

                <v-data-table
                  v-else
                  density="compact"
                  :headers="updateRequiredHeaders"
                  hide-default-footer
                  :items="routesRequiringUpdate"
                  :items-per-page="-1"
                >
                  <!-- Route column -->
                  <template #item.route="{ item }">
                    <div class="d-flex align-center">
                      <v-chip color="primary" size="small" variant="outlined">
                        {{ item.route }}
                      </v-chip>
                    </div>
                  </template>

                  <!-- Missing Assignments column -->
                  <template #item.missingAssignments="{ item }">
                    <div class="d-flex flex-column ga-1">
                      <!-- Missing Driver chips - First row -->
                      <div v-if="item.missingDriverDates.length > 0" class="d-flex flex-wrap ga-1">
                        <v-tooltip 
                          v-for="date in item.missingDriverDates"
                          :key="`driver-${date}`"
                          location="top"
                        >
                          <template #activator="{ props }">
                            <v-chip
                              v-bind="props"
                              color="warning"
                              size="x-small"
                              variant="outlined"
                              class="d-flex align-center cursor-pointer hover-chip"
                              @click.stop="selectDriverFromMissingAssignments(item.routeId, date)"
                            >
                              <v-icon class="mr-1" icon="mdi-account" size="12" />
                              {{ formatMissingDate(date) }}
                            </v-chip>
                          </template>
                          <span>Click to assign driver for {{ item.route }} on {{ formatMissingDate(date) }}</span>
                        </v-tooltip>
                      </div>
                      <!-- Missing Truck chips - Second row -->
                      <div v-if="item.missingTruckDates.length > 0" class="d-flex flex-wrap ga-1">
                        <v-chip
                          v-for="date in item.missingTruckDates"
                          :key="`truck-${date}`"
                          color="error"
                          size="x-small"
                          variant="outlined"
                          class="d-flex align-center"
                        >
                          <v-icon class="mr-1" icon="mdi-truck" size="12" />
                          {{ formatMissingDate(date) }}
                        </v-chip>
                      </div>
                    </div>
                  </template>
                </v-data-table>
              </div>
            </v-expand-transition>
          </v-card>
        </v-col>

        <!-- Planning Calendar/Table -->
        <v-col cols="12">
          <v-card class="h-100">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" icon="mdi-calendar-clock" />
                Upcoming Routes
              </div>
              <!-- Week Navigation -->
              <div class="d-flex align-center gap-2 flex-grow-1 justify-center">
                <v-btn
                  color="primary"
                  icon="mdi-chevron-left"
                  size="small"
                  variant="text"
                  @click="previousWeek"
                />
                <div class="text-body-1 font-weight-medium px-4">
                  {{ formatWeekRange(currentWeekStart) }}
                </div>
                <v-btn
                  color="primary"
                  icon="mdi-chevron-right"
                  size="small"
                  variant="text"
                  @click="nextWeek"
                />
              </div>
              <!-- Apply and Revert Buttons -->
              <div class="d-flex align-center gap-2">
                <v-btn
                  :color="hasChanges ? 'primary' : 'grey'"
                  :disabled="!hasChanges"
                  variant="elevated"
                  @click="showApplyDialog"
                >
                  Apply
                </v-btn>
                <v-btn
                  :color="hasChanges ? 'warning' : 'grey'"
                  :disabled="!hasChanges"
                  variant="outlined"
                  @click="showRevertDialog"
                >
                  Revert
                </v-btn>
              </div>
            </v-card-title>

            <!-- Table View -->
            <div>
              <v-data-table
                :headers="routeHeaders"
                item-value="_id"
                :items="filteredRoutes"
                :loading="routesLoading"
              >
                <template #headers="{ columns, isSorted, getSortIcon, toggleSort }">
                  <tr>
                    <template v-for="column in columns" :key="column.key">
                      <th>
                        <div class="d-flex flex-column align-center">
                          <span
                            class="me-2 cursor-pointer font-weight-medium"
                            @click="toggleSort(column)"
                            v-text="column.title"
                          />

                          <span
                            v-if="column.subtitle"
                            class="text-caption text-grey-darken-1"
                            v-text="column.subtitle"
                          />

                          <v-icon
                            v-if="isSorted(column)"
                            color="medium-emphasis"
                            :icon="getSortIcon(column)"
                            size="small"
                          />
                        </div>
                      </th>
                    </template>
                  </tr>
                </template>
                <!-- Route column -->
                <template #item.route="{ item }">
                  <div>
                    <div class="font-weight-medium">{{ item.trkid }}</div>
                    <div class="text-caption text-grey-darken-1">
                      {{ terminals.get(item.terminalId)?.name || 'Unknown Terminal' }}
                    </div>
                  </div>
                </template>

                <!-- Default Driver column -->
                <template #item.assignedDriver="{ item }">
                  <div v-if="item.defaultDriverId && terminalDrivers.get(item.defaultDriverId)">
                    <div class="d-flex align-center">
                      <v-icon
                        class="mr-2"
                        :color="hasDriverPTOThisWeek(item.defaultDriverId) ? 'red' : 'primary'"
                        icon="mdi-account"
                        size="small"
                      />
                      <div>
                        <div
                          class="font-weight-medium"
                          :class="{ 'text-red': hasDriverPTOThisWeek(item.defaultDriverId) }"
                        >
                          {{ terminalDrivers.get(item.defaultDriverId).firstName }} {{ terminalDrivers.get(item.defaultDriverId).lastName }}
                          <v-icon
                            v-if="hasDriverPTOThisWeek(item.defaultDriverId)"
                            class="ml-1"
                            color="red"
                            icon="mdi-account-clock"
                            size="x-small"
                          />
                        </div>
                        <div class="text-caption text-grey-darken-1">ID: {{ terminalDrivers.get(item.defaultDriverId).driverId || 'N/A' }}</div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-grey text-caption">
                    <v-icon class="mr-1" size="small">mdi-account-off</v-icon>
                    No default driver
                  </div>
                </template>

                <!-- Default Truck column -->
                <template #item.assignedTruck="{ item }">
                  <div v-if="item.truckNumber">
                    <!-- Default truck -->
                    <v-chip
                      color="blue"
                      size="small"
                      variant="outlined"
                    >
                      <v-icon class="mr-1" icon="mdi-truck" size="small" />
                      {{ item.truckNumber }}
                    </v-chip>

                    <!-- Legacy subUnitNumber (from route record) -->
                    <div v-if="item.subUnitNumber" class="mt-1">
                      <v-chip
                        color="orange"
                        size="x-small"
                        variant="outlined"
                      >
                        <v-icon class="mr-1" icon="mdi-truck-trailer" size="x-small" />
                        {{ item.subUnitNumber }}
                      </v-chip>
                    </div>

                    <!-- Long-term substitute truck (from route-substitution service) -->
                    <div v-if="getLongTermSubstituteTruck(item._id)" class="mt-1">
                      <v-chip
                        color="orange"
                        size="x-small"
                        variant="outlined"
                      >
                        <v-icon class="mr-1" icon="mdi-truck-trailer" size="x-small" />
                        {{ getLongTermSubstituteTruck(item._id) }}
                      </v-chip>
                    </div>
                  </div>
                  <div v-else class="text-grey text-caption">
                    <v-icon class="mr-1" size="small">mdi-truck-off</v-icon>
                    No default truck
                  </div>
                </template>

                <!-- Sunday column -->
                <!-- Dynamic day columns -->
                <template v-for="[dayNum, dateObj] in weekDateDayMap" :key="dayNum" #[`item.day_${dayNum}`]="{ item }">
                  <div class="d-flex align-center justify-center ga-1">
                    <v-btn
                      :color="getCalendarButtonColor(item._id, dayNum)"
                      :icon="getCalendarButtonIcon(item._id, dayNum)"
                      size="small"
                      variant="text"
                      @click="toggleRoutePlanning(item._id, dayNum)"
                    >
                      <v-icon>{{ getCalendarButtonIcon(item._id, dayNum) }}</v-icon>
                    </v-btn>
                    <template v-if="getRoutePlanning(item._id, dayNum)">
                      <v-btn
                        :class="getDriverButtonClass(item, getDateString(dateObj))"
                        :color="getDriverButtonColor(item, getDateString(dateObj))"
                        size="x-small"
                        variant="tonal"
                        @click="selectDriver(item, getDateString(dateObj))"
                      >
                        <span class="text-caption font-weight-bold">{{ getDriverInitials(item._id, getDateString(dateObj)) }}</span>
                        <v-tooltip activator="parent" location="top">
                          {{ getAssignedDriver(item._id, getDateString(dateObj))?.firstName || 'Select Driver' }}
                        </v-tooltip>
                      </v-btn>
                      <v-btn
                        :class="getTruckButtonClass(item, getDateString(dateObj))"
                        :color="getTruckButtonColor(item, getDateString(dateObj))"
                        icon="mdi-truck"
                        size="x-small"
                        variant="tonal"
                        @click="selectTruck(item, getDateString(dateObj))"
                      >
                        <v-icon size="12">mdi-truck</v-icon>
                        <v-tooltip activator="parent" location="top">
                          {{ getAssignedTruck(item._id, getDateString(dateObj)) || 'Select Truck' }}
                        </v-tooltip>
                      </v-btn>
                    </template>
                  </div>
                </template>

                <!-- Actions column -->
                <template #item.actions="{ item }">
                  <v-btn
                    color="primary"
                    icon="mdi-cog"
                    size="small"
                    variant="text"
                    @click="configureRoute(item)"
                  >
                    <v-icon>mdi-cog</v-icon>
                    <v-tooltip activator="parent" location="top">
                      Configure Route
                    </v-tooltip>
                  </v-btn>
                </template>
                <!-- No data slot -->
                <template #no-data>
                  <div class="text-center py-8">
                    <v-icon class="mb-2" color="grey" icon="mdi-calendar-remove" size="48" />
                    <p class="text-grey">No routes found</p>
                    <p class="text-caption text-grey">Select a terminal to view routes</p>
                  </div>
                </template>
              </v-data-table>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Driver Selection Dialog -->
    <v-dialog v-model="driverSelectionDialog" max-height="80vh" max-width="600px">
      <v-card class="d-flex flex-column" style="height: 70vh;">
        <v-card-title>Select Driver for {{ selectedRoute?.trkid }} - {{ getDayName(selectedDay) }}</v-card-title>
        <v-card-text class="flex-grow-1 overflow-y-auto px-0">
          <v-list>
            <!-- Default Driver (if exists and available) -->
            <template v-if="getDefaultDriverForDialog()">
              <v-list-item
                class="bg-green-lighten-5"
                :class="{ 'v-list-item--active': selectedDriver === getDefaultDriverForDialog() }"
                @click="selectedDriver = getDefaultDriverForDialog()"
              >
                <template #prepend>
                  <v-icon color="success" icon="mdi-account-check" />
                </template>
                <v-list-item-title>{{ getDefaultDriverForDialog().firstName }} {{ getDefaultDriverForDialog().lastName }}</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip color="success" size="x-small" variant="flat">DEFAULT</v-chip>
                  Driver ID: {{ getDefaultDriverForDialog().driverId || 'N/A' }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-divider class="my-2" />
              <v-list-subheader>Available Drivers</v-list-subheader>
            </template>

            <!-- Available Drivers (excluding default and assigned ones) -->
            <v-list-item
              v-for="driver in getAvailableDriversForDialog()"
              :key="driver._id"
              :class="{ 'v-list-item--active': selectedDriver === driver }"
              @click="selectedDriver = driver"
            >
              <template #prepend>
                <v-icon color="primary" icon="mdi-account" />
              </template>
              <v-list-item-title>{{ driver.firstName }} {{ driver.lastName }}</v-list-item-title>
              <v-list-item-subtitle>Driver ID: {{ driver.driverId || 'N/A' }}</v-list-item-subtitle>
            </v-list-item>

            <!-- No drivers available message -->
            <v-list-item v-if="getAvailableDriversForDialog().length === 0 && !getDefaultDriverForDialog()">
              <template #prepend>
                <v-icon color="grey" icon="mdi-account-off" />
              </template>
              <v-list-item-title class="text-grey">No available drivers</v-list-item-title>
              <v-list-item-subtitle>All drivers are currently assigned</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <!-- Long-term substitution option - Fixed at bottom -->
        <v-divider />
        <div class="pa-4">
          <div class="d-flex align-center">
            <v-checkbox
              v-model="longTermDriverSubstitution"
              color="primary"
              density="compact"
              hide-details
              label="Long-term substitution"
            />
            <v-tooltip activator="parent" location="top">
              <div class="text-caption">
                <strong>Long-term substitution:</strong><br>
                When checked, this substitution will be ongoing with no end date.<br>
                When unchecked, this will be a temporary substitution for this specific date only.
              </div>
            </v-tooltip>
            <v-icon
              class="ml-1"
              color="grey"
              icon="mdi-help-circle-outline"
              size="small"
            />
          </div>
        </div>

        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="closeDriverSelectionDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!driverDialogHasChanges"
            variant="elevated"
            @click="applyDriverSelection"
          >
            Apply
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Truck Selection Dialog -->
    <v-dialog v-model="truckSelectionDialog" max-height="80vh" max-width="600px">
      <v-card class="d-flex flex-column" style="height: 70vh;">
        <v-card-title>Select Truck for {{ selectedRoute?.trkid }} - {{ new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) }}</v-card-title>
        <!-- Add New Truck Option - Fixed at top -->
        <div class="pa-4 pb-2">
          <v-text-field
            v-model="newTruckNumber"
            clearable
            density="compact"
            label="Enter New Truck Number"
            placeholder="Type truck number to add new truck"
            prepend-inner-icon="mdi-truck-plus"
            variant="outlined"
            @keyup.enter="addNewTruck"
          >
            <template #append>
              <v-btn
                color="primary"
                :disabled="!newTruckNumber?.trim()"
                icon="mdi-plus"
                size="small"
                variant="tonal"
                @click="addNewTruck"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </template>
          </v-text-field>
        </div>

        <v-divider />

        <!-- Scrollable truck list -->
        <v-card-text class="flex-grow-1 overflow-y-auto px-0">

          <v-list>
            <!-- Substitute Truck (if exists and available) -->
            <template v-if="getSubstituteTruckForDialog()">
              <v-list-item
                class="bg-orange-lighten-5"
                :class="{ 'v-list-item--active': selectedTruck === getSubstituteTruckForDialog() }"
                @click="selectedTruck = getSubstituteTruckForDialog()"
              >
                <template #prepend>
                  <v-icon color="warning" icon="mdi-truck-trailer" />
                </template>
                <v-list-item-title>{{ getSubstituteTruckForDialog().equipmentNumber }}</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip color="warning" size="x-small" variant="flat">SUBSTITUTE</v-chip>
                  {{ getSubstituteTruckForDialog().truckType || 'Unknown Type' }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>

            <!-- Default Truck (if exists and available) -->
            <template v-if="getRouteDefaultTruckForDialog()">
              <v-list-item
                class="bg-green-lighten-5"
                :class="{ 'v-list-item--active': selectedTruck === getRouteDefaultTruckForDialog() }"
                @click="selectedTruck = getRouteDefaultTruckForDialog()"
              >
                <template #prepend>
                  <v-icon color="success" icon="mdi-truck-check" />
                </template>
                <v-list-item-title>{{ getRouteDefaultTruckForDialog().equipmentNumber }}</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip color="success" size="x-small" variant="flat">DEFAULT</v-chip>
                  {{ getRouteDefaultTruckForDialog().truckType || 'Unknown Type' }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>

            <!-- Divider and subheader if any trucks above -->
            <template v-if="getSubstituteTruckForDialog() || getRouteDefaultTruckForDialog()">
              <v-divider class="my-2" />
              <v-list-subheader>Available Trucks</v-list-subheader>
            </template>

            <!-- Available Trucks (excluding default and assigned ones) -->
            <v-list-item
              v-for="truck in getAvailableTrucksForDialog()"
              :key="truck._id"
              :class="{ 'v-list-item--active': selectedTruck === truck }"
              @click="selectedTruck = truck"
            >
              <template #prepend>
                <v-icon color="blue" icon="mdi-truck" />
              </template>
              <v-list-item-title>{{ truck.equipmentNumber }}</v-list-item-title>
              <v-list-item-subtitle>{{ truck.truckType || 'Unknown Type' }}</v-list-item-subtitle>
            </v-list-item>

            <!-- No trucks available message -->
            <v-list-item v-if="getAvailableTrucksForDialog().length === 0 && !getSubstituteTruckForDialog() && !getRouteDefaultTruckForDialog()">
              <template #prepend>
                <v-icon color="grey" icon="mdi-truck-off" />
              </template>
              <v-list-item-title class="text-grey">No available trucks</v-list-item-title>
              <v-list-item-subtitle>Add a new truck number above</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <!-- Long-term substitution option - Fixed at bottom -->
        <v-divider />
        <div class="pa-4">
          <div class="d-flex align-center">
            <v-checkbox
              v-model="longTermTruckSubstitution"
              color="primary"
              density="compact"
              hide-details
              label="Long-term substitution"
            />
            <v-tooltip activator="parent" location="top">
              <div class="text-caption">
                <strong>Long-term substitution:</strong><br>
                When checked, this substitution will be ongoing with no end date.<br>
                When unchecked, this will be a temporary substitution for this specific date only.
              </div>
            </v-tooltip>
            <v-icon
              class="ml-1"
              color="grey"
              icon="mdi-help-circle-outline"
              size="small"
            />
          </div>
        </div>

        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="closeTruckSelectionDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!truckDialogHasChanges"
            variant="elevated"
            @click="applyTruckSelection"
          >
            Apply
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Apply Changes Dialog -->
    <v-dialog v-model="applyDialog" max-width="800px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2" icon="mdi-calendar-sync" />
          Apply Route Changes
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            Review the changes below before applying them to the schedule:
          </p>

          <v-data-table
            class="elevation-1"
            density="compact"
            :headers="changesHeaders"
            hide-default-footer
            item-value="key"
            :items="changesList"
            :items-per-page="-1"
            :loading="false"
          >
            <!-- Date column -->
            <template #item.date="{ item }">
              <div class="font-weight-medium">
                {{ formatChangeDate(item.date) }}
              </div>
            </template>

            <!-- Route column -->
            <template #item.route="{ item }">
              <v-chip color="primary" size="x-small" variant="outlined">
                {{ item.route }}
              </v-chip>
            </template>

            <!-- Change Type column -->
            <template #item.changeType="{ item }">
              <v-chip
                :color="getChangeTypeColor(item.changeType)"
                size="x-small"
                variant="flat"
              >
                {{ item.changeType }}
              </v-chip>
            </template>

            <!-- Driver column -->
            <template #item.driver="{ item }">
              <span v-if="item.driver" class="text-body-2">{{ item.driver }}</span>
              <span v-else class="text-grey">-</span>
            </template>

            <!-- Truck column -->
            <template #item.truck="{ item }">
              <span v-if="item.truck" class="text-body-2">{{ item.truck }}</span>
              <span v-else class="text-grey">-</span>
            </template>
          </v-data-table>

          <div v-if="changesList.length === 0" class="text-center py-8">
            <v-icon class="mb-2" color="grey" icon="mdi-information" size="48" />
            <p class="text-grey">No changes to apply</p>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="cancelApply">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :disabled="changesList.length === 0"
            variant="elevated"
            @click="saveChanges"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Revert Changes Dialog -->
    <v-dialog v-model="revertDialog" max-width="500px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2" color="warning" icon="mdi-alert-circle" />
          Revert All Changes
        </v-card-title>
        <v-card-text>
          <p class="text-body-1 mb-3">
            Are you sure you want to revert all pending changes?
          </p>
          <v-alert
            class="mb-3"
            type="warning"
            variant="tonal"
          >
            <strong>Warning:</strong> All your unsaved changes will be lost and the original values will be restored.
          </v-alert>
          <p class="text-body-2">
            This action cannot be undone.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="cancelRevert">
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            variant="elevated"
            @click="confirmRevert"
          >
            Revert All Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'
  import { usePlanningStore } from '@/stores/planning'
  import { type Terminal } from '@/utils/terminal-url-helpers'

  const authStore = useAuthStore()
  const planningStore = usePlanningStore()
  const router = useRouter()
  const route = useRoute()

  // Reactive data
  const loading = ref(true)
  const routesLoading = ref(false)

  // Data collections
  const routes = ref<Map<string, any>>(new Map())
  const terminals = ref<Map<string, any>>(new Map())
  const plannedRoutes = ref<Map<string, any>>(new Map()) // Map of routeId+date to planned route
  const routeSubstitutions = ref<Map<string, any[]>>(new Map()) // Map of routeId to substitutions array
  const terminalDrivers = ref<Map<string, any>>(new Map()) // Drivers from selected terminal
  const terminalEquipment = ref<Map<string, any>>(new Map()) // Equipment from selected terminal
  const driverPTORecords = ref<Map<string, any[]>>(new Map()) // Map of driverId to PTO records array
  const allDrivers = ref<Map<string, any>>(new Map()) // All drivers loaded for unavailable routes display

  // Change tracking
  const originalPlannedRoutes = ref<Map<string, any>>(new Map()) // Original state for comparison
  const applyDialog = ref(false)
  const revertDialog = ref(false)

  // Filters
  const selectedTerminalId = ref<string | null>(null)

  // Routes requiring update
  const showRoutesRequiringUpdate = ref<boolean>(true)

  // Week navigation - use Pinia store for persistence
  const currentWeekStart = computed({
    get: () => new Date(planningStore.currentWeekStart),
    set: (value: Date) => planningStore.setCurrentWeek(value),
  })

  // Week start date (Sunday) for the current week
  const weekStartDate = ref<Date>(new Date())

  // Mapping of day of week to date for the current week
  const weekDateDayMap = ref<Map<number, Date>>(new Map())

  // Selection dialogs
  const driverSelectionDialog = ref(false)
  const truckSelectionDialog = ref(false)
  const selectedRoute = ref<any>(null)
  const selectedDay = ref<number>(0)
  const selectedDate = ref<string>('') // Store actual date for driver selections
  const newTruckNumber = ref<string>('')
  const selectedTruck = ref<any>(null)
  const selectedDriver = ref<any>(null)
  const selectedDriverInitial = ref<any>(null)
  const longTermDriverSubstitution = ref<boolean>(false)
  const longTermDriverSubstitutionInitial = ref<boolean>(false)
  const longTermTruckSubstitution = ref<boolean>(false)
  const longTermTruckSubstitutionInitial = ref<boolean>(false)

  // No terminal pre-selection - user can choose from dropdown
  const terminalIdFromUrl = ''

  // Computed properties
  const filteredRoutes = computed(() => {
    return Array.from(routes.value.values()).filter(route => {
      if (selectedTerminalId.value && route.terminalId !== selectedTerminalId.value) {
        return false
      }
      return true
    })
  })

  const terminalOptions = computed(() => {
    return Array.from(terminals.value.values()).map(terminal => ({
      text: terminal.name,
      value: terminal._id,
    }))
  })

  // Computed properties for dialog state changes
  const driverDialogHasChanges = computed(() => {
    return selectedDriver.value !== null
      || longTermDriverSubstitution.value !== longTermDriverSubstitutionInitial.value
  })

  const truckDialogHasChanges = computed(() => {
    return selectedTruck.value !== null
      || longTermTruckSubstitution.value !== longTermTruckSubstitutionInitial.value
  })

  // Change tracking computed properties
  const hasChanges = computed(() => {
    return planningStore.hasPendingChanges
  })

  // Routes missing driver or truck assignments (comprehensive version)
  const routesRequiringUpdate = computed(() => {
    console.log(`🔄 Recomputing routesRequiringUpdate for top-level planning at ${new Date().toISOString()}`)
    const updates: any[] = []

    // Get the date range for the next 2 weeks
    const today = new Date()
    const twoWeeksFromNow = new Date()
    twoWeeksFromNow.setDate(today.getDate() + 14)

    // Check each route for missing assignments
    for (const route of routes.value.values()) {
      // If terminal is selected, filter to that terminal only
      if (selectedTerminalId.value && route.terminalId !== selectedTerminalId.value) {
        continue
      }

      // TODO: Add route substitutions support for top-level planning
      // For now, we'll use empty array - this can be enhanced later
      const routeSubstitutionsList: any[] = []

      const missingDriverDates: string[] = []
      const missingTruckDates: string[] = []

      // Check each day for the next 2 weeks
      for (let d = new Date(today); d <= twoWeeksFromNow; d.setDate(d.getDate() + 1)) {
        const dateString = getDateKey(d)
        const dayOfWeek = d.getDay()

        // Check if route is scheduled for this day of week
        const dayFields = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        const dayField = dayFields[dayOfWeek]

        if (route[dayField] === true) {
          // Route is scheduled for this day - check for driver assignment
          let hasDriverAssignment = false
          let hasTruckAssignment = false

          // Check for default driver
          if (route.defaultDriverId) {
            // Check if default driver is available (not on PTO)
            const isOnPTO = isDriverOnPTO(route.defaultDriverId, dateString)
            if (!isOnPTO) {
              hasDriverAssignment = true
            }
          }

          // Check for driver substitution covering this date
          const driverSub = routeSubstitutionsList.find(sub => {
            if (!sub.driverId) return false // Must have a driver assigned
            
            const startDate = sub.startDate ? new Date(sub.startDate) : null
            const endDate = sub.endDate ? new Date(sub.endDate) : null
            const checkDate = new Date(dateString)
            
            // If no start date, substitution applies immediately
            const startsBeforeOrOn = !startDate || startDate <= checkDate
            // If no end date, substitution is ongoing; otherwise check if we're before end date
            const endsAfterOrOn = !endDate || endDate >= checkDate
            
            return startsBeforeOrOn && endsAfterOrOn
          })
          if (driverSub) {
            hasDriverAssignment = true
          }

          // Check for default truck
          if (route.truckNumber) {
            hasTruckAssignment = true
          }

          // Check for truck substitution covering this date
          const truckSub = routeSubstitutionsList.find(sub => {
            if (!sub.truckNumber) return false // Must have a truck assigned
            
            const startDate = sub.startDate ? new Date(sub.startDate) : null
            const endDate = sub.endDate ? new Date(sub.endDate) : null
            const checkDate = new Date(dateString)
            
            // If no start date, substitution applies immediately
            const startsBeforeOrOn = !startDate || startDate <= checkDate
            // If no end date, substitution is ongoing; otherwise check if we're before end date
            const endsAfterOrOn = !endDate || endDate >= checkDate
            
            return startsBeforeOrOn && endsAfterOrOn
          })
          if (truckSub) {
            hasTruckAssignment = true
          }

          // Track missing assignments
          if (!hasDriverAssignment) {
            console.log(`❌ Missing driver assignment for ${route.trkid} on ${dateString}`)
            missingDriverDates.push(dateString)
          }
          if (!hasTruckAssignment) {
            console.log(`❌ Missing truck assignment for ${route.trkid} on ${dateString}`)
            missingTruckDates.push(dateString)
          }
        }
      }

      // Only add to updates if there are missing assignments
      if (missingDriverDates.length > 0 || missingTruckDates.length > 0) {
        const missingDates = [...missingDriverDates, ...missingTruckDates]
          .filter((date, index, array) => array.indexOf(date) === index) // Remove duplicates
          .sort() // Sort dates

        updates.push({
          routeId: route._id,
          route: route.trkid,
          missingDriverDates: missingDriverDates.sort(),
          missingTruckDates: missingTruckDates.sort(),
          missingDates: missingDates, // Combined for backward compatibility
          terminal: terminals.value.get(route.terminalId)?.name || 'Unknown',
        })
      }
    }

    return updates.sort((a, b) => a.route.localeCompare(b.route))
  })

  // Table headers for routes requiring update
  const updateRequiredHeaders = [
    { title: 'Route', key: 'route', sortable: true, width: '120px' },
    { title: 'Missing Assignments', key: 'missingAssignments', sortable: false, width: '600px' },
  ]

  const changesList = computed(() => {
    const changes: any[] = []

    for (const [key, change] of planningStore.pendingChanges.entries()) {
      let routeId: string
      let date: string

      // Handle new date-based substitutions
      if (change.type === 'driver-substitution' || change.type === 'truck-substitution') {
        routeId = change.routeId
        date = change.executionDate || ''
      } else {
        // Handle legacy route-dayOfWeek keys
        const [id, dayOfWeek] = key.split('-')
        routeId = id
        const weekStart = new Date(currentWeekStart.value)
        const dateObj = new Date(weekStart)
        dateObj.setDate(weekStart.getDate() + Number.parseInt(dayOfWeek))
        date = dateObj.toISOString().split('T')[0]
      }

      const route = routes.value.get(routeId)

      // Get driver and truck info for the change
      const driver = change.assignedDriverId ? terminalDrivers.value.get(change.assignedDriverId) : null
      const truck = change.assignedTruckNumber
        || (change.assignedTruckId ? terminalEquipment.value.get(change.assignedTruckId)?.equipmentNumber : null)

      // Determine change type
      let changeType = 'Unknown'
      switch (change.type) {
        case 'driver-substitution':
        case 'driver-assignment': {
          changeType = change.isLongTermDriver ? 'Long-term Driver' : 'Driver'

          break
        }
        case 'truck-substitution':
        case 'truck-assignment': {
          changeType = change.isLongTermTruck ? 'Long-term Truck' : 'Truck'

          break
        }
        case 'combined-assignment': {
          changeType = 'Driver & Truck'

          break
        }
      // No default
      }

      changes.push({
        key,
        date,
        route: route?.trkid || 'Unknown',
        changeType,
        driver: driver ? `${driver.firstName} ${driver.lastName}` : null,
        truck,
      })
    }

    return changes.sort((a, b) => a.date.localeCompare(b.date))
  })

  // Table headers for changes dialog
  const changesHeaders = [
    { title: 'Date', key: 'date', sortable: true, width: '100px' },
    { title: 'Route', key: 'route', sortable: true, width: '80px' },
    { title: 'Type', key: 'changeType', sortable: true, width: '80px' },
    { title: 'Driver', key: 'driver', sortable: false, width: '150px' },
    { title: 'Truck', key: 'truck', sortable: false, width: '100px' },
  ]

  // Table headers computed property with day columns
  const routeHeaders = computed(() => {
    const headers = [
      { title: 'Route', key: 'route', sortable: true, width: '200px' },
      { title: 'Default Driver', key: 'assignedDriver', sortable: false, width: '200px' },
      { title: 'Default Truck', key: 'assignedTruck', sortable: false, width: '150px' },
    ]

    // Add columns for each day of the week
    for (const [dayNum, dateObj] of weekDateDayMap.value) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayName = dayNames[dayNum]
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })

      headers.push({
        title: dayName,
        subtitle: dateStr,
        key: `day_${dayNum}`,
        sortable: false,
        width: '120px',
        align: 'center' as const,
      } as any)
    }

    // Add actions column
    headers.push({
      title: 'Actions',
      key: 'actions',
      sortable: false,
      width: '80px',
      align: 'center' as const,
    })

    return headers
  })

  // Helper function to update weekDateDayMap for a given Sunday date
  const updateWeekDateDayMap = (sundayDate: Date) => {
    const dateMap = new Map<number, Date>()
    for (let day = 0; day <= 6; day++) {
      const date = new Date(sundayDate)
      date.setDate(sundayDate.getDate() + day)
      dateMap.set(day, date)
    }
    weekDateDayMap.value = dateMap
    weekStartDate.value = new Date(sundayDate)
  }

  // Helper functions
  function getStartOfWeek (date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day // Sunday = 0
    return new Date(d.setDate(diff))
  }

  function getDateKey (date: Date): string {
    return date.toISOString().split('T')[0]
  }

  // Helper function to safely convert date to string
  function getDateString (date: any): string {
    // Handle array case (from Map.entries() destructuring issue)
    if (Array.isArray(date)) {
      console.error('Received array instead of date:', date)
      // Try to use the second element if it's a Date
      if (date.length > 1 && date[1] instanceof Date) {
        return date[1].toISOString().split('T')[0]
      }
      return new Date().toISOString().split('T')[0] // Use today as fallback
    }

    if (date instanceof Date) {
      return date.toISOString().split('T')[0]
    }
    if (typeof date === 'string') {
      return date
    }
    // Fallback - try to create a date
    try {
      return new Date(date).toISOString().split('T')[0]
    } catch {
      console.error('Invalid date:', date)
      return new Date().toISOString().split('T')[0] // Use today as fallback
    }
  }

  // Methods
  const loadInitialData = async () => {
    try {
      loading.value = true

      // Load all terminals
      const terminalsResponse = await feathersClient.service('terminals').find({
        query: { $limit: 1000 },
      })

      const terminalsMap = new Map()
      terminalsResponse.data.forEach((terminal: any) => {
        terminalsMap.set(terminal._id, terminal)
      })
      terminals.value = terminalsMap

      // Load routes and planned routes for current week
      await loadRoutes()
      await loadPlannedRoutesForWeek()

      // Always load availability records for Routes Requiring Update section
      await loadDriverPTORecords()
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      loading.value = false
    }
  }

  const loadRoutes = async () => {
    try {
      routesLoading.value = true
      const query: any = { $limit: 1000 }
      if (selectedTerminalId.value) {
        query.terminalId = selectedTerminalId.value
      }

      const routesResponse = await feathersClient.service('routes').find({ query })

      const routesMap = new Map()
      routesResponse.data.forEach((route: any) => {
        routesMap.set(route._id, route)
      })
      routes.value = routesMap

      // Load route substitutions for all routes
      await loadRouteSubstitutions()

      // Load terminal-specific drivers and equipment
      if (selectedTerminalId.value) {
        await loadTerminalDriversAndEquipment()
        await loadDriverPTORecords()
      }
    } catch (error) {
      console.error('Error loading routes:', error)
    } finally {
      routesLoading.value = false
    }
  }

  const loadTerminalDriversAndEquipment = async () => {
    try {
      // Collect all unique driver IDs from routes
      const driverIds = new Set<string>()
      const equipmentNumbers = new Set<string>()

      Array.from(routes.value.values()).forEach((route: any) => {
        if (route.defaultDriverId) {
          driverIds.add(route.defaultDriverId)
        }
        if (route.truckNumber) {
          equipmentNumbers.add(route.truckNumber)
        }
        if (route.subUnitNumber) {
          equipmentNumbers.add(route.subUnitNumber)
        }
      })

      // Load all drivers - since driver schema doesn't have terminalId, we load all and use what we need
      const driversMap = new Map()

      // Load all drivers for the assignment dialogs and default lookups
      const allDriversResponse = await feathersClient.service('drivers').find({
        query: { $limit: 1000 },
      })

      allDriversResponse.data.forEach((driver: any) => {
        driversMap.set(driver._id, driver)
      })

      terminalDrivers.value = driversMap

      // Load equipment by equipment numbers
      const equipmentMap = new Map()

      // Load all equipment - since equipment schema doesn't have terminalId, we load all and use what we need
      const allEquipmentResponse = await feathersClient.service('equipment').find({
        query: { $limit: 1000 },
      })

      allEquipmentResponse.data.forEach((equipment: any) => {
        equipmentMap.set(equipment._id, equipment)
        if (equipment.equipmentNumber) {
          equipmentMap.set(equipment.equipmentNumber, equipment)
        }
      })

      terminalEquipment.value = equipmentMap
    } catch (error) {
      console.error('Error loading drivers and equipment:', error)
    }
  }

  const loadDriverPTORecords = async () => {
    try {
      console.log('🔍 Loading availability records from history service')

      // For Routes with Unavailable Drivers, we want to load all availability records
      // regardless of terminal selection to show system-wide unavailability issues

      // Calculate date range for current week (plus buffer for long-term PTO)
      const weekStart = new Date(currentWeekStart.value)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      // Add buffer to check for ongoing PTO that might overlap this week
      const rangeStart = new Date(weekStart)
      rangeStart.setDate(weekStart.getDate() - 30) // Check 30 days back
      const rangeEnd = new Date(weekEnd)
      rangeEnd.setDate(weekEnd.getDate() + 30) // Check 30 days forward

      console.log('📅 Date range for availability query:')
      console.log('  Range start:', getDateKey(rangeStart))
      console.log('  Range end:', getDateKey(rangeEnd))

      const query: any = {
        historyType: 'availability',
        $limit: 1000,
      }

      console.log('🔎 History query:', query)

      const response = await feathersClient.service('history').find({ query })

      console.log('📋 History response received:', response.data.length, 'records')
      console.log('📄 Raw history records:', response.data.map(r => ({
        _id: r._id,
        entityId: r.entityId,
        timestamp: r.timestamp,
        summary: r.summary,
        data: r.data,
        notes: r.notes,
      })))

      // Group history records by driver ID (using entityId)
      const ptoMap = new Map()
      response.data.forEach((record: any) => {
        const driverId = record.entityId
        if (!ptoMap.has(driverId)) {
          ptoMap.set(driverId, [])
        }
        ptoMap.get(driverId).push(record)
      })

      console.log('🗂️ Grouped history records by driver:')
      for (const [driverId, records] of ptoMap.entries()) {
        console.log(`  Driver ${driverId}:`, records.length, 'records')
        records.forEach((r: any, idx: number) => {
          console.log(`    ${idx + 1}. ${r.summary} | ${r.data?.startDate || 'no start'} to ${r.data?.endDate || 'no end'}`)
        })
      }

      driverPTORecords.value = ptoMap

      // Preload all drivers that appear in PTO records
      const driverIdsInPTO = Array.from(ptoMap.keys())
      if (driverIdsInPTO.length > 0) {
        console.log('🔍 Preloading driver info for PTO drivers:', driverIdsInPTO)
        await loadMissingDrivers(driverIdsInPTO)
      }

      // Also preload all drivers that have routes (for cases where driver has route but no PTO)
      const allRouteDriverIds = new Set<string>()
      for (const route of routes.value.values()) {
        if (route.defaultDriverId) {
          allRouteDriverIds.add(route.defaultDriverId)
        }
      }
      
      // Find drivers with routes that aren't already loaded
      const unloadedDriverIds = Array.from(allRouteDriverIds).filter(id => 
        !terminalDrivers.value.has(id) && !allDrivers.value.has(id)
      )
      
      if (unloadedDriverIds.length > 0) {
        console.log('🔍 Preloading driver info for route drivers without PTO:', unloadedDriverIds)
        await loadMissingDrivers(unloadedDriverIds)
      }

      console.log('✅ Availability records loaded successfully')
    } catch (error) {
      console.error('❌ Error loading driver PTO records:', error)
      driverPTORecords.value = new Map()
    }
  }

  const loadMissingDrivers = async (driverIds: string[]) => {
    try {
      console.log('🔍 Loading missing driver information for IDs:', driverIds)
      let loadedCount = 0

      for (const driverId of driverIds) {
        try {
          console.log(`  Fetching driver: ${driverId}`)
          const driver = await feathersClient.service('drivers').get(driverId)
          allDrivers.value.set(driver._id, driver)
          loadedCount++
          console.log(`  ✅ Loaded: ${driver.firstName} ${driver.lastName} (${driver._id})`)
        } catch (error) {
          console.error(`  ❌ Failed to load driver ${driverId}:`, error)
        }
      }

      console.log('✅ Successfully loaded', loadedCount, 'of', driverIds.length, 'missing drivers')
    } catch (error) {
      console.error('❌ Error loading missing drivers:', error)
    }
  }

  const loadRouteSubstitutions = async () => {
    try {
      const routeIds = Array.from(routes.value.keys())
      if (routeIds.length === 0) return

      // Calculate date range for current week
      const weekStart = new Date(currentWeekStart.value)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const query: any = {
        routeId: { $in: routeIds },
        $limit: 1000,
        $or: [
          // No dates specified (ongoing substitution)
          { startDate: { $exists: false }, endDate: { $exists: false } },
          // No start date (immediate) and end date within or after range
          { startDate: { $exists: false }, endDate: { $gte: getDateKey(weekStart) } },
          // Start date within or before range and no end date (ongoing)
          { startDate: { $lte: getDateKey(weekEnd) }, endDate: { $exists: false } },
          // Start date within or before range and end date within or after range
          { startDate: { $lte: getDateKey(weekEnd) }, endDate: { $gte: getDateKey(weekStart) } },
        ],
      }

      const response = await feathersClient.service('route-substitution').find({ query })

      // Group substitutions by routeId
      const substitutionsMap = new Map()
      response.data.forEach((substitution: any) => {
        const routeId = substitution.routeId
        if (!substitutionsMap.has(routeId)) {
          substitutionsMap.set(routeId, [])
        }
        substitutionsMap.get(routeId).push(substitution)
      })

      routeSubstitutions.value = substitutionsMap
    } catch (error) {
      console.error('Error loading route substitutions:', error)
      routeSubstitutions.value = new Map()
    }
  }

  const loadPlannedRoutesForWeek = async () => {
    try {
      // Calculate week dates
      const weekStart = new Date(currentWeekStart.value)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const query: any = {
        executionDate: {
          $gte: getDateKey(weekStart),
          $lte: getDateKey(weekEnd),
        },
        $limit: 1000,
      }

      if (selectedTerminalId.value) {
        // Filter by routes from this terminal
        const terminalRoutes = Array.from(routes.value.values())
          .filter(route => route.terminalId === selectedTerminalId.value)
          .map(route => route._id)

        if (terminalRoutes.length > 0) {
          query.routeId = { $in: terminalRoutes }
        }
      }

      const response = await feathersClient.service('dispatched-routes').find({ query })

      // Create a map for quick lookup: routeId+dayOfWeek -> planned route
      const plannedMap = new Map()

      // Add existing dispatched routes
      response.data.forEach((planned: any) => {
        const date = new Date(planned.executionDate)
        const dayOfWeek = date.getDay()
        const key = `${planned.routeId}-${dayOfWeek}`
        plannedMap.set(key, planned)
      })

      // Add routes that should be scheduled based on their weekly schedule booleans
      const dayFields = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      for (const route of routes.value.values()) {
        // Skip if terminal filter doesn't match
        if (selectedTerminalId.value && route.terminalId !== selectedTerminalId.value) {
          continue
        }

        for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
          const dayField = dayFields[dayOfWeek]
          const key = `${route._id}-${dayOfWeek}`

          // If route should run this day and no existing planned route
          if (route[dayField] === true && !plannedMap.has(key)) {
            // Create a virtual planned route entry
            const date = new Date(weekStart)
            date.setDate(weekStart.getDate() + dayOfWeek)

            plannedMap.set(key, {
              routeId: route._id,
              executionDate: getDateKey(date),
              status: 'planned',
              priority: 'normal',
              isVirtual: true, // Mark as not yet saved to database
            })
          }
        }
      }

      plannedRoutes.value = plannedMap

      // Store original state for change tracking
      originalPlannedRoutes.value = new Map(plannedMap)

      // Generate long-term substitution changes for this week (but don't clean up old changes during navigation)
      planningStore.generateLongTermChangesForWeek(currentWeekStart.value, routes.value, plannedRoutes.value)
    } catch (error) {
      console.error('Error loading planned routes:', error)
      plannedRoutes.value = new Map()
      originalPlannedRoutes.value = new Map()
    }
  }

  // Helper methods for calendar functionality
  const getRoutePlanning = (routeId: string, dayOfWeek: number): boolean => {
    const key = `${routeId}-${dayOfWeek}`
    const pendingChange = planningStore.getPendingChange(key)

    // If there's a pending change, use its state
    if (pendingChange) {
      return pendingChange.type !== 'cancel'
    }

    // Otherwise check the current planned routes
    const planned = plannedRoutes.value.get(key)
    if (planned) {
      return true // Already planned
    }

    // Check route's weekly schedule booleans
    const route = routes.value.get(routeId)
    if (route) {
      const dayFields = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const dayField = dayFields[dayOfWeek]
      return route[dayField] === true
    }

    return false
  }

  // Get the calendar button color based on state
  const getCalendarButtonColor = (routeId: string, dayOfWeek: number): string => {
    const key = `${routeId}-${dayOfWeek}`
    const pendingChange = planningStore.getPendingChange(key)

    if (pendingChange) {
      switch (pendingChange.type) {
        case 'schedule': {
          return 'success'
        }
        case 'cancel': {
          return 'warning'
        }
        default: {
          return 'success'
        }
      }
    }

    const planned = plannedRoutes.value.get(key)
    if (planned) {
      return 'success' // Scheduled
    }

    // Check if it should be pre-checked (Monday-Friday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return 'success'
    }

    return 'grey' // Unscheduled
  }

  // Get the calendar button icon based on state
  const getCalendarButtonIcon = (routeId: string, dayOfWeek: number): string => {
    const key = `${routeId}-${dayOfWeek}`
    const pendingChange = planningStore.getPendingChange(key)

    if (pendingChange) {
      switch (pendingChange.type) {
        case 'schedule': {
          return 'mdi-calendar-check'
        }
        case 'cancel': {
          return 'mdi-calendar-remove'
        }
        default: {
          return 'mdi-calendar-check'
        }
      }
    }

    const planned = plannedRoutes.value.get(key)
    if (planned) {
      return 'mdi-calendar-check' // Scheduled
    }

    // Check if it should be pre-checked (Monday-Friday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return 'mdi-calendar-check'
    }

    return 'mdi-calendar-remove' // Unscheduled
  }

  // Toggle route planning with three states: unscheduled -> scheduled -> canceled -> unscheduled
  const toggleRoutePlanning = (routeId: string, dayOfWeek: number) => {
    const key = `${routeId}-${dayOfWeek}`
    const currentlyPlanned = getRoutePlanning(routeId, dayOfWeek)
    const pendingChange = planningStore.getPendingChange(key)
    const originalPlanned = originalPlannedRoutes.value.get(key)

    if (pendingChange) {
      // If there's a pending change, cycle through states
      switch (pendingChange.type) {
        case 'schedule': {
          // From scheduled to canceled
          planningStore.setPendingChange(key, {
            type: 'cancel',
            routeId,
            dayOfWeek,
            originalPlanned,
          })
          break
        }
        case 'cancel': {
          // From canceled back to original state or unscheduled
          if (originalPlanned) {
            // Back to original scheduled state
            planningStore.removePendingChange(key)
          } else {
            // Back to unscheduled
            planningStore.removePendingChange(key)
          }
          break
        }
      }
    } else {
      // No pending change, create one
      if (originalPlanned) {
        // Originally scheduled, mark for cancellation
        planningStore.setPendingChange(key, {
          type: 'cancel',
          routeId,
          dayOfWeek,
          originalPlanned,
        })
      } else {
        // Originally unscheduled, mark for scheduling
        planningStore.setPendingChange(key, {
          type: 'schedule',
          routeId,
          dayOfWeek,
          executionDate: getDateKey(getDateForDayOfWeek(dayOfWeek)),
          status: 'planned',
          priority: 'normal',
        })
      }
    }
  }

  // Get date for a specific day of the week in current week
  const getDateForDayOfWeek = (dayOfWeek: number): Date => {
    const weekStart = new Date(currentWeekStart.value)
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + dayOfWeek)
    return date
  }

  // Get assigned truck for a specific date, considering substitutions and pending changes
  const getAssignedTruck = (routeId: string, date: string): string => {
    // Check for pending truck substitutions - check ALL substitutions for this route
    let applicableTruckSub = null

    // Get all pending changes and filter for this route's truck substitutions
    for (const [key, change] of planningStore.pendingChanges.entries()) {
      if (change.type === 'truck-substitution' && change.routeId === routeId && change.truckNumber) {
        // Check if this substitution applies to the target date
        const startDate = change.startDate
        const endDate = change.endDate

        // No dates specified (immediate ongoing) or date falls within range
        if (!startDate
          || (date >= startDate && (!endDate || date <= endDate))) {
          applicableTruckSub = change
          break // Use first applicable substitution found
        }
      }
    }

    if (applicableTruckSub) {
      return applicableTruckSub.truckNumber
    }

    // Check for pending driver substitutions that might have combined assignment
    const driverSubKey = `driver-sub-${routeId}-${date}`
    const pendingDriverSub = planningStore.getPendingChange(driverSubKey)
    if (pendingDriverSub && pendingDriverSub.assignedTruckNumber) {
      return pendingDriverSub.assignedTruckNumber
    }

    // Check for temporary truck substitutions from route-substitution service (has endDate)
    const temporarySubstituteTruck = getTemporarySubstituteTruck(routeId, date)
    if (temporarySubstituteTruck) {
      return temporarySubstituteTruck
    }

    // Check for long-term truck substitutions from route-substitution service (no endDate)
    const longTermSubstituteTruck = getLongTermSubstituteTruckForDate(routeId, date)
    if (longTermSubstituteTruck) {
      return longTermSubstituteTruck
    }

    // Fall back to route default truck
    const route = routes.value.get(routeId)
    return route?.truckNumber || ''
  }

  // Get assigned driver for a specific date, considering pending changes
  const getAssignedDriver = (routeId: string, date: string): any => {
    // Check for pending driver substitutions - check ALL substitutions for this route
    let applicableDriverSub = null

    // Get all pending changes and filter for this route's driver substitutions
    for (const [key, change] of planningStore.pendingChanges.entries()) {
      if (change.type === 'driver-substitution' && change.routeId === routeId && change.driverId) {
        // Check if this substitution applies to the target date
        const startDate = change.startDate
        const endDate = change.endDate

        // No dates specified (immediate ongoing) or date falls within range
        if (!startDate
          || (date >= startDate && (!endDate || date <= endDate))) {
          applicableDriverSub = change
          break // Use first applicable substitution found
        }
      }
    }

    if (applicableDriverSub) {
      return terminalDrivers.value.get(applicableDriverSub.driverId)
    }

    // Check for pending truck substitutions that might have combined assignment
    const truckSubKey = `truck-sub-${routeId}-${date}`
    const pendingTruckSub = planningStore.getPendingChange(truckSubKey)
    if (pendingTruckSub && pendingTruckSub.driverId) {
      return terminalDrivers.value.get(pendingTruckSub.driverId)
    }

    // Check for temporary driver substitutions from route-substitution service (has endDate)
    const temporarySubstituteDriver = getTemporarySubstituteDriver(routeId, date)
    if (temporarySubstituteDriver) {
      return temporarySubstituteDriver
    }

    // Check for long-term driver substitutions from route-substitution service (no endDate)
    const longTermSubstituteDriver = getLongTermSubstituteDriverForDate(routeId, date)
    if (longTermSubstituteDriver) {
      return longTermSubstituteDriver
    }

    // Fall back to route default driver
    const route = routes.value.get(routeId)
    if (route?.defaultDriverId) {
      return terminalDrivers.value.get(route.defaultDriverId)
    }

    return null
  }

  // Check if a substitution is active for a specific date
  const isSubstitutionActiveForDate = (substitution: any, dateKey: string): boolean => {
    const hasStartDate = substitution.startDate
    const hasEndDate = substitution.endDate

    // No dates specified (ongoing substitution)
    if (!hasStartDate && !hasEndDate) {
      return true
    }

    // No start date (immediate) - check if end date is after or on the target date
    if (!hasStartDate && hasEndDate) {
      return dateKey <= substitution.endDate
    }

    // No end date (ongoing) - check if start date is before or on the target date
    if (hasStartDate && !hasEndDate) {
      return dateKey >= substitution.startDate
    }

    // Both dates specified - check if target date is within range
    if (hasStartDate && hasEndDate) {
      return dateKey >= substitution.startDate && dateKey <= substitution.endDate
    }

    return false
  }

  // Get long-term substitute truck for a route (has start date but no end date)
  const getLongTermSubstituteTruck = (routeId: string): string | null => {
    const substitutions = routeSubstitutions.value.get(routeId) || []

    for (const substitution of substitutions) {
      if (substitution.truckNumber && substitution.startDate && !substitution.endDate) {
        return substitution.truckNumber
      }
    }

    return null
  }

  // Check if a long-term substitute truck should apply to a specific date
  const getLongTermSubstituteTruckForDate = (routeId: string, date: string): string | null => {
    const substitutions = routeSubstitutions.value.get(routeId) || []

    for (const substitution of substitutions) {
      if (substitution.truckNumber && substitution.startDate && !substitution.endDate // Only apply if current date is on or after the start date
        && date >= substitution.startDate) {
        return substitution.truckNumber
      }
    }

    return null
  }

  // Get temporary substitute truck for a specific date (has start/end dates)
  const getTemporarySubstituteTruck = (routeId: string, date: string): string | null => {
    const substitutions = routeSubstitutions.value.get(routeId) || []

    for (const substitution of substitutions) {
      if (substitution.truckNumber && substitution.startDate && substitution.endDate && isSubstitutionActiveForDate(substitution, date)) {
        return substitution.truckNumber
      }
    }

    return null
  }

  // Get long-term substitute driver for a route (has start date but no end date)
  const getLongTermSubstituteDriver = (routeId: string): any => {
    const substitutions = routeSubstitutions.value.get(routeId) || []

    for (const substitution of substitutions) {
      if (substitution.driverId && substitution.startDate && !substitution.endDate) {
        return terminalDrivers.value.get(substitution.driverId)
      }
    }

    return null
  }

  // Get long-term substitute driver for a specific date (no endDate)
  const getLongTermSubstituteDriverForDate = (routeId: string, date: string): any => {
    const substitutions = routeSubstitutions.value.get(routeId) || []

    for (const substitution of substitutions) {
      if (substitution.driverId && !substitution.endDate // Only apply if current date is on or after the start date
        && substitution.startDate && date >= substitution.startDate) {
        return terminalDrivers.value.get(substitution.driverId)
      }
    }

    return null
  }

  // Get temporary substitute driver for a specific date (has endDate)
  const getTemporarySubstituteDriver = (routeId: string, date: string): any => {
    const substitutions = routeSubstitutions.value.get(routeId) || []

    for (const substitution of substitutions) {
      if (substitution.driverId && substitution.endDate && isSubstitutionActiveForDate(substitution, date)) {
        return terminalDrivers.value.get(substitution.driverId)
      }
    }

    return null
  }

  // Check if a substitution is long-term (no dates) vs temporary (has dates)
  const isLongTermSubstitution = (substitution: any): boolean => {
    return !substitution.startDate && !substitution.endDate
  }

  // Get truck button color based on assignment type
  const getTruckButtonColor = (route: any, date: string): string => {
    // Check for pending truck substitutions first (date-based)
    const truckSubKey = `truck-sub-${route._id}-${date}`
    const pendingTruckSub = planningStore.getPendingChange(truckSubKey)

    // Blue for unsaved truck changes
    if (pendingTruckSub && pendingTruckSub.truckNumber) {
      return 'blue'
    }

    // Check for long-term truck substitutions (route-only key)
    const longTermTruckSubKey = `truck-sub-${route._id}`
    const pendingLongTermTruckSub = planningStore.getPendingChange(longTermTruckSubKey)

    // Blue for unsaved long-term truck changes that apply to this date
    if (pendingLongTermTruckSub && pendingLongTermTruckSub.truckNumber) {
      const startDate = pendingLongTermTruckSub.startDate
      if (!startDate || date >= startDate) {
        return 'blue'
      }
    }

    // Check for pending driver substitutions that might have combined assignment
    const driverSubKey = `driver-sub-${route._id}-${date}`
    const pendingDriverSub = planningStore.getPendingChange(driverSubKey)
    if (pendingDriverSub && pendingDriverSub.assignedTruckNumber) {
      return 'blue'
    }

    const assignedTruck = getAssignedTruck(route._id, date)
    const temporarySubstitute = getTemporarySubstituteTruck(route._id, date)

    // Temporary substitute (has start/end dates) - yellow
    if (temporarySubstitute && assignedTruck === temporarySubstitute) {
      return 'yellow-darken-2'
    }

    // Long-term substitute (start date but no end date) - orange
    const longTermSubstituteForDate = getLongTermSubstituteTruckForDate(route._id, date)
    if (longTermSubstituteForDate && assignedTruck === longTermSubstituteForDate) {
      return 'orange'
    }

    // Default truck - green
    if (assignedTruck === route.truckNumber) {
      return 'green'
    }

    // Other truck - grey
    return 'grey'
  }

  // Get truck button class for special styling
  const getTruckButtonClass = (route: any, date: string): string => {
    // Check for pending truck substitutions first (date-based)
    const truckSubKey = `truck-sub-${route._id}-${date}`
    const pendingTruckSub = planningStore.getPendingChange(truckSubKey)

    // Blue with white outline for unsaved truck changes
    if (pendingTruckSub && pendingTruckSub.truckNumber) {
      return 'truck-button-unsaved'
    }

    // Check for long-term truck substitutions (route-only key)
    const longTermTruckSubKey = `truck-sub-${route._id}`
    const pendingLongTermTruckSub = planningStore.getPendingChange(longTermTruckSubKey)

    // Blue with white outline for unsaved long-term truck changes that apply to this date
    if (pendingLongTermTruckSub && pendingLongTermTruckSub.truckNumber) {
      const startDate = pendingLongTermTruckSub.startDate
      if (!startDate || date >= startDate) {
        return 'truck-button-unsaved'
      }
    }

    // Check for pending driver substitutions that might have combined assignment
    const driverSubKey = `driver-sub-${route._id}-${date}`
    const pendingDriverSub = planningStore.getPendingChange(driverSubKey)
    if (pendingDriverSub && pendingDriverSub.assignedTruckNumber) {
      return 'truck-button-unsaved'
    }

    const assignedTruck = getAssignedTruck(route._id, date)
    const temporarySubstitute = getTemporarySubstituteTruck(route._id, date)

    // Temporary substitute gets black outline
    if (temporarySubstitute && assignedTruck === temporarySubstitute) {
      return 'truck-button-outlined'
    }

    return ''
  }

  // Week navigation functions
  const nextWeek = async () => {
    const nextWeekStart = new Date(weekStartDate.value)
    nextWeekStart.setDate(nextWeekStart.getDate() + 7)

    // Update week date mapping
    updateWeekDateDayMap(nextWeekStart)

    // Update planning store
    currentWeekStart.value = nextWeekStart

    // Reload data for new week
    await loadPlannedRoutesForWeek()
    await loadRouteSubstitutions()
    await loadDriverPTORecords()
  }

  const previousWeek = async () => {
    const prevWeekStart = new Date(weekStartDate.value)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)

    // Update week date mapping
    updateWeekDateDayMap(prevWeekStart)

    // Update planning store
    currentWeekStart.value = prevWeekStart

    // Reload data for new week
    await loadPlannedRoutesForWeek()
    await loadRouteSubstitutions()
    await loadDriverPTORecords()
  }

  const updateRoutePlanning = async (routeId: string, dayOfWeek: number, checked: boolean) => {
    const key = `${routeId}-${dayOfWeek}`
    const existing = plannedRoutes.value.get(key)

    if (checked && !existing) {
      // Create new planned route
      const weekStart = new Date(currentWeekStart.value)
      const executionDate = new Date(weekStart)
      executionDate.setDate(weekStart.getDate() + dayOfWeek)

      try {
        const newPlanned = await feathersClient.service('dispatched-routes').create({
          routeId: routeId,
          executionDate: getDateKey(executionDate),
          status: 'planned',
          priority: 'normal',
        })

        plannedRoutes.value.set(key, newPlanned)
      } catch (error) {
        console.error('Error creating planned route:', error)
      }
    } else if (!checked && existing) {
      // Remove planned route
      try {
        await feathersClient.service('dispatched-routes').remove(existing._id)
        plannedRoutes.value.delete(key)
      } catch (error) {
        console.error('Error removing planned route:', error)
      }
    }
  }

  const formatWeekRange = (weekStart: Date): string => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'long' })
    const startDay = weekStart.getDate()
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'long' })
    const endDay = weekEnd.getDate()
    const year = weekEnd.getFullYear()

    // If both dates are in the same month
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${startMonth} ${startDay} to ${endDay}, ${year}`
    } else {
      // If dates span different months
      return `${startMonth} ${startDay} to ${endMonth} ${endDay}, ${year}`
    }
  }

  // Selection dialog methods
  const selectDriver = (route: any, date: string) => {
    selectedRoute.value = route
    selectedDate.value = date // Store the actual date instead of converting to dayOfWeek

    // Initialize dialog state
    selectedDriver.value = null
    selectedDriverInitial.value = null
    longTermDriverSubstitution.value = false
    longTermDriverSubstitutionInitial.value = false

    driverSelectionDialog.value = true
  }

  const selectTruck = (route: any, date: string) => {
    selectedRoute.value = route
    selectedDate.value = date // Store the actual date instead of converting to dayOfWeek

    // Initialize dialog state
    selectedTruck.value = null
    longTermTruckSubstitution.value = false
    longTermTruckSubstitutionInitial.value = false

    truckSelectionDialog.value = true
  }

  const getDayName = (dayOfWeek: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayOfWeek] || 'Unknown'
  }

  // Get substitute truck for the dialog (subUnitNumber or long-term substitution)
  const getSubstituteTruckForDialog = (): any => {
    // First check for long-term substitute from route-substitution service for the selected date
    const longTermSubstitute = getLongTermSubstituteTruckForDate(selectedRoute.value?._id, selectedDate.value)
    if (longTermSubstitute) {
      const substituteTruck = terminalEquipment.value.get(longTermSubstitute)
      if (substituteTruck && isTruckAvailableForDate(substituteTruck, selectedDate.value)) {
        return substituteTruck
      }
    }

    // Fall back to legacy subUnitNumber from route record
    if (!selectedRoute.value?.subUnitNumber) return null

    const substituteTruck = terminalEquipment.value.get(selectedRoute.value.subUnitNumber)
    if (!substituteTruck) return null

    // Check if this truck is available (not assigned to other routes for this date)
    if (isTruckAvailableForDate(substituteTruck, selectedDate.value)) {
      return substituteTruck
    }

    return null
  }

  // Get route default truck for the dialog (truckNumber)
  const getRouteDefaultTruckForDialog = (): any => {
    if (!selectedRoute.value?.truckNumber) return null

    const defaultTruck = terminalEquipment.value.get(selectedRoute.value.truckNumber)
    if (!defaultTruck) return null

    // Check if this truck is available (not assigned to other routes for this date)
    if (isTruckAvailableForDate(defaultTruck, selectedDate.value)) {
      return defaultTruck
    }

    return null
  }

  // Get default truck for the dialog (prioritize substitute, then default) - for backward compatibility
  const getDefaultTruckForDialog = (): any => {
    return getSubstituteTruckForDialog() || getRouteDefaultTruckForDialog()
  }

  // Get available trucks for the dialog (excluding default and substitute trucks)
  const getAvailableTrucksForDialog = (): any[] => {
    const defaultTruckNumber = selectedRoute.value?.truckNumber
    const substituteTruckNumber = selectedRoute.value?.subUnitNumber

    // Get unique trucks by deduplicating on _id
    const uniqueTrucks = Array.from(terminalEquipment.value.values())
      .filter((truck: any, index: number, array: any[]) => {
        // Keep only the first occurrence of each truck based on _id
        return array.findIndex(t => t._id === truck._id) === index
      })

    return uniqueTrucks.filter((truck: any) => {
      // Exclude the default truck (it's shown separately at top)
      if (truck.equipmentNumber === defaultTruckNumber) {
        return false
      }

      // Exclude the substitute truck (it's shown separately at top)
      if (truck.equipmentNumber === substituteTruckNumber) {
        return false
      }

      // Only include available trucks
      return isTruckAvailableForDate(truck, selectedDate.value)
    })
  }

  // Check if a truck is available for a specific date
  const isTruckAvailableForDate = (truck: any, date: string): boolean => {
    // Check all routes to see if this truck is already assigned as default or for this specific date
    for (const route of routes.value.values()) {
      // Skip the current route we're editing
      if (route._id === selectedRoute.value?._id) continue

      // Check if this truck is the default for another route
      if (route.truckNumber === truck.equipmentNumber) {
        return false
      }

      // Check if this truck is assigned to another route for this specific date
      const assignedTruck = getAssignedTruck(route._id, date)
      if (assignedTruck === truck.equipmentNumber) {
        return false
      }
    }

    return true
  }

  // Add new truck
  const addNewTruck = async () => {
    if (!newTruckNumber.value?.trim()) return

    const truckNumber = newTruckNumber.value.trim()

    // Create a temporary truck object for assignment
    const newTruck = {
      _id: `temp-${Date.now()}`,
      equipmentNumber: truckNumber,
      truckType: 'Unknown',
    }

    // Add to equipment map temporarily (only once by _id)
    terminalEquipment.value.set(newTruck._id, newTruck)

    // Select this truck (don't assign immediately)
    selectedTruck.value = newTruck

    // Clear the input
    newTruckNumber.value = ''
  }

  // Substitute a truck for a specific date on a route (creates route-substitution entry)
  const substituteTruck = (truck: any, date: string) => {
    if (!selectedRoute.value) return

    // Create substitution data matching the route-substitution schema exactly
    const substitutionData: any = {
      routeId: selectedRoute.value._id,
      truckNumber: truck.equipmentNumber,
      startDate: date,
      reason: longTermTruckSubstitution.value
        ? `Long-term truck substitution starting ${date}`
        : `Temporary truck substitution for ${date}`,
      notes: `Truck: ${truck.equipmentNumber} (${truck.truckType || 'Unknown Type'})`,
    }

    // For long-term substitutions, only set startDate (no endDate means ongoing)
    // For temporary substitutions, set both startDate and endDate to the same date
    if (!longTermTruckSubstitution.value) {
      substitutionData.endDate = date
    }

    // Store this as a pending truck substitution
    // Use route-only key for long-term, route-date key for temporary
    const substitutionKey = longTermTruckSubstitution.value
      ? `truck-sub-${selectedRoute.value._id}`
      : `truck-sub-${selectedRoute.value._id}-${date}`

    planningStore.setPendingChange(substitutionKey, {
      type: 'truck-substitution',
      executionDate: date,
      ...substitutionData,
    })

    // Close the dialog
    closeTruckSelectionDialog()
  }

  // Apply truck selection and close dialog
  const applyTruckSelection = () => {
    if (selectedTruck.value) {
      // Truck was selected, substitute it for the clicked date
      substituteTruck(selectedTruck.value, selectedDate.value)
    } else if (longTermTruckSubstitution.value !== longTermTruckSubstitutionInitial.value) {
      // Only checkbox changed, need to update the long-term state
      // For now, we'll need to get the currently assigned truck and reapply with new long-term state
      const currentAssigned = getAssignedTruck(selectedRoute.value._id, selectedDate.value)
      if (currentAssigned) {
        // Find the truck object by number
        const truckObj = Array.from(terminalEquipment.value.values()).find(t => t.equipmentNumber === currentAssigned)
        if (truckObj) {
          substituteTruck(truckObj, selectedDate.value)
        }
      }
    }

    // Close the dialog
    closeTruckSelectionDialog()
  }

  // Close truck selection dialog and clean up
  const closeTruckSelectionDialog = () => {
    truckSelectionDialog.value = false
    longTermTruckSubstitution.value = false
    selectedTruck.value = null
    newTruckNumber.value = ''
    selectedRoute.value = null
    selectedDate.value = ''
  }

  // Substitute a driver for a specific date on a route (creates route-substitution entry)
  const substituteDriver = (driver: any, date: string) => {
    if (!selectedRoute.value) return

    // Create substitution data matching the route-substitution schema exactly
    const substitutionData: any = {
      routeId: selectedRoute.value._id,
      driverId: driver._id,
      startDate: date,
      reason: longTermDriverSubstitution.value
        ? `Long-term driver substitution starting ${date}`
        : `Temporary driver substitution for ${date}`,
      notes: `Driver: ${driver.firstName} ${driver.lastName} (${driver.driverId || 'No ID'})`,
    }

    // For long-term substitutions, only set startDate (no endDate means ongoing)
    // For temporary substitutions, set both startDate and endDate to the same date
    if (!longTermDriverSubstitution.value) {
      substitutionData.endDate = date
    }

    // Store this as a pending driver substitution
    // Use route-only key for long-term, route-date key for temporary
    const substitutionKey = longTermDriverSubstitution.value
      ? `driver-sub-${selectedRoute.value._id}`
      : `driver-sub-${selectedRoute.value._id}-${date}`

    planningStore.setPendingChange(substitutionKey, {
      type: 'driver-substitution',
      executionDate: date,
      ...substitutionData,
    })

    // TODO: Normalize substitution entries for this route to minimize duplicates

    // Close the dialog
    closeDriverSelectionDialog()
  }

  // Get default driver for the dialog (if available and not assigned elsewhere)
  const getDefaultDriverForDialog = (): any => {
    if (!selectedRoute.value?.defaultDriverId) return null

    const defaultDriver = terminalDrivers.value.get(selectedRoute.value.defaultDriverId)
    if (!defaultDriver) return null

    // Check if this driver is available (not assigned to other routes for this date)
    if (isDriverAvailableForDate(defaultDriver, selectedDate.value)) {
      return defaultDriver
    }

    return null
  }

  // Get available drivers for the dialog (excluding default and assigned ones)
  const getAvailableDriversForDialog = (): any[] => {
    const defaultDriverId = selectedRoute.value?.defaultDriverId

    return Array.from(terminalDrivers.value.values()).filter((driver: any) => {
      // Exclude the default driver (it's shown separately)
      if (driver._id === defaultDriverId) {
        return false
      }

      // Only include available drivers
      return isDriverAvailableForDate(driver, selectedDate.value)
    })
  }

  // Check if a driver is available for a specific date
  const isDriverAvailableForDate = (driver: any, date: string): boolean => {
    // Check all routes to see if this driver is already assigned as default or for this specific date
    for (const route of routes.value.values()) {
      // Skip the current route we're editing
      if (route._id === selectedRoute.value?._id) continue

      // Check if this driver is the default for another route
      if (route.defaultDriverId === driver._id) {
        return false
      }

      // Check if this driver is assigned to another route for this specific date
      const assignedDriver = getAssignedDriver(route._id, date)
      if (assignedDriver && assignedDriver._id === driver._id) {
        return false
      }
    }

    return true
  }

  // Legacy function - kept for compatibility but converts to date-based check
  const isDriverAvailableForDay = (driver: any, dayOfWeek: number): boolean => {
    const date = getDateFromDayOfWeek(dayOfWeek)
    return isDriverAvailableForDate(driver, date)
  }

  // Check if a driver is on PTO for a specific date
  const isDriverOnPTO = (driverId: string, date: string): boolean => {
    const historyRecords = driverPTORecords.value.get(driverId) || []

    for (const record of historyRecords) {
      const data = record.data || {}

      // Check if the history record overlaps with the target date
      let isUnavailable = false

      // Method 1: Check data.startDate and data.endDate if present
      if (data.startDate && data.endDate) {
        isUnavailable = date >= data.startDate && date <= data.endDate
      }
      // Method 2: Check data.startDate with no end date (ongoing)
      else if (data.startDate && !data.endDate) {
        isUnavailable = date >= data.startDate
      }

      // Check if the record indicates unavailability
      if (isUnavailable && data.availabilityType && data.availabilityType !== 'Available') {
        return true
      }
    }

    return false
  }

  // Check if a driver has PTO for any day in the current week
  const hasDriverPTOThisWeek = (driverId: string): boolean => {
    const weekStart = new Date(currentWeekStart.value)

    for (let day = 0; day <= 6; day++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + day)
      const dateString = getDateKey(date)

      if (isDriverOnPTO(driverId, dateString)) {
        return true
      }
    }

    return false
  }

  // Check if driver has availability information for a specific date
  const hasDriverAvailabilityInfo = (driverId: string, date: string): boolean => {
    const ptoRecords = driverPTORecords.value.get(driverId) || []

    console.log(`🔎 Checking availability for driver ${driverId} on ${date}`)
    console.log(`📋 Records to check:`, ptoRecords.length)

    // Check if there's any availability record for this date
    for (const record of ptoRecords) {
      const data = record.data || {}

      console.log(`📄 Checking record:`, {
        summary: record.summary,
        startDate: data.startDate,
        endDate: data.endDate,
        timestamp: record.timestamp,
        targetDate: date,
      })

      // Check if this record covers the target date
      let coversDate = false

      // Method 1: Check data.startDate and data.endDate if present
      if (data.startDate && data.endDate) {
        coversDate = date >= data.startDate && date <= data.endDate
        console.log(`📅 Date range check: ${date} between ${data.startDate} and ${data.endDate} = ${coversDate}`)
      }
      // Method 2: Check data.startDate with no end date (ongoing)
      else if (data.startDate && !data.endDate) {
        coversDate = date >= data.startDate
        console.log(`📅 Open-ended check: ${date} >= ${data.startDate} = ${coversDate}`)
      }
      // Method 3: Check single date in data.date field
      else if (data.date) {
        coversDate = date === data.date
        console.log(`📅 Single date check: ${date} === ${data.date} = ${coversDate}`)
      }
      // Method 4: Use timestamp as single date
      else if (record.timestamp) {
        const recordDate = new Date(record.timestamp).toISOString().split('T')[0]
        coversDate = date === recordDate
        console.log(`📅 Timestamp check: ${date} === ${recordDate} = ${coversDate}`)
      }

      if (coversDate) {
        console.log(`✅ Found availability info for ${date}`)
        return true // Has availability info for this date
      }
    }

    console.log(`❌ No availability info found for ${date}`)
    return false // No availability info found for this date
  }

  // Check if driver has any availability entries at all
  const hasDriverAnyAvailabilityEntries = (driverId: string): boolean => {
    const ptoRecords = driverPTORecords.value.get(driverId) || []
    return ptoRecords.length > 0
  }

  // Format missing date for display
  const formatMissingDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
    })
  }

  // Apply driver selection and close dialog
  const applyDriverSelection = () => {
    if (selectedDriver.value) {
      // Driver was selected, substitute it for the clicked date
      substituteDriver(selectedDriver.value, selectedDate.value)
    } else if (longTermDriverSubstitution.value !== longTermDriverSubstitutionInitial.value) {
      // Only checkbox changed, need to update the long-term state
      // For now, we'll need to get the currently assigned driver and reapply with new long-term state
      const currentAssigned = getAssignedDriver(selectedRoute.value._id, selectedDate.value)
      if (currentAssigned) {
        substituteDriver(currentAssigned, selectedDate.value)
      }
    }

    // Close the dialog
    closeDriverSelectionDialog()
  }

  // Close driver selection dialog and clean up
  const closeDriverSelectionDialog = () => {
    driverSelectionDialog.value = false
    longTermDriverSubstitution.value = false
    selectedDriver.value = null
    selectedRoute.value = null
    selectedDate.value = ''
  }

  // Apply dialog methods
  const showApplyDialog = () => {
    applyDialog.value = true
  }

  const cancelApply = () => {
    applyDialog.value = false
  }

  const showRevertDialog = () => {
    revertDialog.value = true
  }

  const cancelRevert = () => {
    revertDialog.value = false
  }

  const confirmRevert = async () => {
    try {
      // Clear ALL pending changes and session storage completely
      planningStore.clearAllChanges()

      // Also clear session storage directly to ensure complete cleanup
      sessionStorage.removeItem('planning-store')

      // Reload all data from backend to restore original state
      await loadRoutes()
      await loadPlannedRoutesForWeek()
      await loadRouteSubstitutions()
      await loadDriverPTORecords()

      // Close the dialog
      revertDialog.value = false

      console.log('All changes reverted and session storage cleared')
    } catch (error) {
      console.error('Error reverting changes:', error)
    }
  }

  const saveChanges = async () => {
    try {
      for (const [key, change] of planningStore.pendingChanges.entries()) {
        // Only handle driver-substitution and truck-substitution types
        if (change.type === 'driver-substitution' || change.type === 'truck-substitution') {
          // Create substitution data - the change already has the correct schema format
          const substitutionData: any = {
            routeId: change.routeId,
            startDate: change.startDate,
            reason: change.reason,
            notes: change.notes,
          }

          // Add endDate only if present (temporary substitutions)
          if (change.endDate) {
            substitutionData.endDate = change.endDate
          }

          // Add driver substitution if present
          if (change.driverId) {
            substitutionData.driverId = change.driverId
          }

          // Add truck substitution if present
          if (change.truckNumber) {
            substitutionData.truckNumber = change.truckNumber
          }

          // Create the substitution record
          await feathersClient.service('route-substitution').create(substitutionData)
        }
      }

      // Clear pending changes after successful save
      planningStore.clearAllChanges()

      // Reload the data to reflect changes
      await loadRouteSubstitutions()
      await loadPlannedRoutesForWeek()
      await loadDriverPTORecords()

      // Close dialog
      applyDialog.value = false
    } catch (error) {
      console.error('Error saving changes:', error)
    }
  }

  // Helper methods for apply dialog
  const formatChangeDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const getChangeTypeColor = (changeType: string): string => {
    switch (changeType) {
      case 'Truck': {
        return 'blue'
      }
      case 'Driver': {
        return 'purple'
      }
      case 'Truck & Driver': {
        return 'indigo'
      }
      case 'schedule': {
        return 'success'
      }
      case 'cancel': {
        return 'warning'
      }
      default: {
        return 'info'
      }
    }
  }

  // Get driver button color based on assignment status
  const getDriverButtonColor = (route: any, date: string): string => {
    // Check for pending driver substitutions - check ALL substitutions for this route
    let hasPendingDriverChange = false

    for (const [key, change] of planningStore.pendingChanges.entries()) {
      if (change.type === 'driver-substitution' && change.routeId === route._id && change.driverId) {
        // Check if this substitution applies to the target date
        const startDate = change.startDate
        const endDate = change.endDate

        if (!startDate || (date >= startDate && (!endDate || date <= endDate))) {
          hasPendingDriverChange = true
          break
        }
      }
    }

    const truckSubKey = `truck-sub-${route._id}-${date}`
    const pendingTruckSub = planningStore.getPendingChange(truckSubKey)

    // Blue for unsaved driver changes
    if (hasPendingDriverChange || (pendingTruckSub && pendingTruckSub.driverId !== undefined)) {
      return 'blue'
    }

    const assignedDriver = getAssignedDriver(route._id, date)
    const defaultDriver = route.defaultDriverId ? terminalDrivers.value.get(route.defaultDriverId) : null
    const temporarySubstituteDriver = getTemporarySubstituteDriver(route._id, date)

    if (!assignedDriver) {
      return 'grey' // No assignment
    }

    // Check if assigned driver is on PTO for this date - RED takes highest priority
    if (isDriverOnPTO(assignedDriver._id, date)) {
      return 'red'
    }

    // Temporary substitute driver (has start/end dates) - yellow
    if (temporarySubstituteDriver && assignedDriver._id === temporarySubstituteDriver._id) {
      return 'yellow-darken-2'
    }

    // Long-term substitute driver (start date but no end date) - orange
    const longTermSubstituteDriverForDate = getLongTermSubstituteDriverForDate(route._id, date)
    if (longTermSubstituteDriverForDate && assignedDriver._id === longTermSubstituteDriverForDate._id) {
      return 'orange'
    }

    // Default driver - green
    if (defaultDriver && assignedDriver._id === route.defaultDriverId) {
      return 'green'
    }

    // Other driver - grey
    return 'grey'
  }

  // Get driver button class for special styling
  const getDriverButtonClass = (route: any, date: string): string => {
    // Check for pending driver substitutions - check ALL substitutions for this route
    let hasPendingDriverChange = false

    for (const [key, change] of planningStore.pendingChanges.entries()) {
      if (change.type === 'driver-substitution' && change.routeId === route._id && change.driverId) {
        // Check if this substitution applies to the target date
        const startDate = change.startDate
        const endDate = change.endDate

        if (!startDate || (date >= startDate && (!endDate || date <= endDate))) {
          hasPendingDriverChange = true
          break
        }
      }
    }

    const truckSubKey = `truck-sub-${route._id}-${date}`
    const pendingTruckSub = planningStore.getPendingChange(truckSubKey)

    // Blue with white outline for unsaved changes
    if (hasPendingDriverChange || (pendingTruckSub && pendingTruckSub.driverId !== undefined)) {
      return 'driver-button-unsaved'
    }

    const assignedDriver = getAssignedDriver(route._id, date)
    const temporarySubstituteDriver = getTemporarySubstituteDriver(route._id, date)

    // Temporary substitute gets white outline
    if (temporarySubstituteDriver && assignedDriver && assignedDriver._id === temporarySubstituteDriver._id) {
      return 'driver-button-outlined'
    }

    return ''
  }

  // Helper function to get date string from dayOfWeek
  const getDateFromDayOfWeek = (dayOfWeek: number): string => {
    const weekStart = new Date(currentWeekStart.value)
    const targetDate = new Date(weekStart)
    targetDate.setDate(weekStart.getDate() + dayOfWeek)
    return getDateKey(targetDate)
  }

  // Get driver initials for display
  const getDriverInitials = (routeId: string, date: string): string => {
    const driver = getAssignedDriver(routeId, date)

    if (!driver) {
      return '?'
    }

    const firstName = driver.firstName || ''
    const lastName = driver.lastName || ''

    const firstInitial = firstName.charAt(0).toUpperCase()
    const lastInitial = lastName.charAt(0).toUpperCase()

    return `${firstInitial}${lastInitial}` || '?'
  }

  // Event handlers
  // Helper function to convert route name to URL-safe format
  const routeNameToUrlSafe = (trkid: string) => {
    return trkid.replace(/\./g, '-')
  }

  const configureRoute = (route: any) => {
    // Navigate to route-specific planning page
    if (route?.trkid) {
      router.push(`/routes/${routeNameToUrlSafe(route.trkid)}/planning`)
    }
  }

  const selectDriverFromMissingAssignments = (routeId: string, date: string) => {
    // Find the route object by ID
    const route = routes.value.get(routeId)
    if (!route) {
      console.error('Route not found:', routeId)
      return
    }
    
    selectDriver(route, date)
  }

  const goBack = () => {
    router.go(-1)
  }

  // Lifecycle
  onMounted(() => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    // Calculate the Sunday date for the current week
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - dayOfWeek)
    weekStartDate.value = sunday

    // Create mapping of day of week (0-6) to dates for the current week
    const dateMap = new Map<number, Date>()
    for (let day = 0; day <= 6; day++) {
      const date = new Date(sunday)
      date.setDate(sunday.getDate() + day)
      dateMap.set(day, date)
    }
    weekDateDayMap.value = dateMap

    // Initialize planning store from session storage
    planningStore.initializeFromSession()

    // If there's a stored week that's different from current, use it
    const storedWeekStart = new Date(planningStore.currentWeekStart)
    const currentWeek = getStartOfWeek(new Date())
    if (storedWeekStart.getTime() !== currentWeek.getTime()) {
      currentWeekStart.value = storedWeekStart
    }

    loadInitialData()
  })
</script>

<style scoped>
.h-100 {
  height: 100%;
}

.v-list-item--active {
  background-color: rgba(25, 118, 210, 0.08);
}

.truck-button-outlined {
  border: 2px solid #fff !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8) !important;
}

.truck-button-unsaved {
  border: 2px solid #fff !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8) !important;
}

.driver-button-unsaved {
  border: 2px solid #fff !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8) !important;
}

.driver-button-outlined {
  border: 2px solid #fff !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8) !important;
}
</style>
