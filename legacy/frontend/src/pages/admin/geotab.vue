<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4">
          <div class="d-flex align-center">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              @click="router.push('/')"
            />
            <div class="ml-3">
              <h1 class="text-h4 mb-1">GEOtab Integration</h1>
              <p class="text-body-1 text-grey-darken-1">
                Real-time fleet tracking and GEOtab API testing
              </p>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="d-flex gap-2">
            <v-btn
              color="success"
              prepend-icon="mdi-database-sync"
              variant="elevated"
              :loading="updatingDatabase"
              @click="updateDatabaseGroups"
              :disabled="!geotabStatus.isAuthenticated"
            >
              Update Database
            </v-btn>
            <v-btn
              color="primary"
              prepend-icon="mdi-refresh"
              variant="elevated"
              :loading="loadingRealTime"
              @click="refreshFromLatestSnapshot"
            >
              Refresh from Snapshot
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Authentication Status Card -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" icon="mdi-account-key" />
            GEOtab Authentication Status
          </v-card-title>
          <v-card-text>
            <div v-if="geotabStatus.isAuthenticated" class="d-flex align-center">
              <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
              <div>
                <div class="text-body-1">
                  Connected to <strong>{{ geotabStatus.database }}</strong> as <strong>{{ geotabStatus.username }}</strong>
                </div>
                <div class="text-caption text-grey">
                  Last authenticated: {{ geotabStatus.lastAuthenticated ? new Date(geotabStatus.lastAuthenticated).toLocaleString() : 'Never' }}
                </div>
              </div>
            </div>
            <div v-else class="d-flex align-center">
              <v-icon color="warning" class="mr-2">mdi-alert-circle</v-icon>
              <div>
                <div class="text-body-1">Not authenticated with GEOtab</div>
                <div class="text-caption text-grey">Use the G icon in the header to authenticate</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Trip Data Section -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-2" icon="mdi-routes" />
              Trip Data
            </div>
            <div class="d-flex align-center gap-3">
              <v-text-field
                v-model="selectedTripDate"
                type="date"
                label="Select Date"
                variant="outlined"
                density="compact"
                style="min-width: 200px"
                hide-details
              />
              <v-btn
                color="primary"
                prepend-icon="mdi-download"
                variant="elevated"
                :loading="loadingTripData"
                :disabled="!selectedTripDate"
                @click="loadTripData"
              >
                Load Trips
              </v-btn>
              <v-btn
                color="secondary"
                prepend-icon="mdi-delete"
                variant="outlined"
                :disabled="tripData.length === 0"
                @click="clearTripData"
              >
                Clear Cache
              </v-btn>
            </div>
          </v-card-title>
          
          <v-card-text>
            <div v-if="loadingTripData" class="text-center py-8">
              <v-progress-circular
                indeterminate
                color="primary"
              />
              <p class="mt-4">Loading trip data...</p>
            </div>
            
            <div v-else-if="tripError" class="text-center py-8">
              <v-icon icon="mdi-alert-circle" color="error" size="48" />
              <p class="text-error mt-4">{{ tripError }}</p>
              <v-btn
                color="primary"
                @click="loadTripData"
                class="mt-4"
                :disabled="!selectedTripDate"
              >
                Try Again
              </v-btn>
            </div>
            
            <div v-else-if="tripData.length === 0" class="text-center py-8 text-grey">
              <v-icon size="48" icon="mdi-routes" />
              <div class="mt-2">No trip data available</div>
              <div class="text-caption">Select a date and click "Load Trips" to fetch data</div>
            </div>
            
            <div v-else>
              <div class="mb-4 d-flex align-center justify-space-between">
                <div class="text-body-2 text-grey">
                  Found {{ groupedTripData.length }} device/driver combinations from {{ tripData.length }} total trips
                  <v-chip 
                    v-if="tripDataFromCache" 
                    color="info" 
                    size="small" 
                    class="ml-2"
                  >
                    <v-icon start size="small">mdi-cached</v-icon>
                    Cached
                  </v-chip>
                </div>
              </div>
              
              <v-data-table
                :headers="tripHeaders"
                :items="groupedTripData"
                class="elevation-1"
                item-key="id"
                :items-per-page="25"
                show-expand
                v-model:expanded="expandedRows"
              >
                <template #item.truckID="{ item }">
                  <div class="d-flex align-center">
                    <v-icon class="mr-1" size="small">mdi-truck</v-icon>
                    <span class="font-weight-medium">
                      {{ item.truckID }}
                    </span>
                    <v-chip v-if="item.enriched" color="success" size="x-small" class="ml-2">
                      <v-icon start size="small">mdi-check</v-icon>
                      Matched
                    </v-chip>
                  </div>
                </template>
                
                <template #item.driver="{ item }">
                  <div class="d-flex align-center">
                    <v-icon class="mr-1" size="small">mdi-account</v-icon>
                    <span>
                      {{ item.driver }}
                    </span>
                  </div>
                </template>
                
                <template #expanded-row="{ columns, item }">
                  <tr>
                    <td :colspan="columns.length">
                      <div class="pa-4">
                        <h4 class="text-h6 mb-3">Individual Trips for {{ item.truckID }} - {{ item.driver }}</h4>
                        <v-data-table
                          :headers="tripDetailHeaders"
                          :items="item.trips"
                          class="elevation-0"
                          density="compact"
                          :items-per-page="-1"
                          hide-default-footer
                        >
                          <!-- Trip inspection icon -->
                          <template #item.inspect="{ item }">
                            <v-btn
                              icon="mdi-code-json"
                              size="small"
                              variant="text"
                              color="primary"
                              @click="openTripInspectionDialog(item)"
                            >
                              <v-icon size="small">mdi-code-json</v-icon>
                              <v-tooltip activator="parent" location="top">
                                Inspect Trip Data
                              </v-tooltip>
                            </v-btn>
                          </template>

                          <template #item.start="{ item }">
                            <div class="d-flex align-center">
                              <v-icon class="mr-1" size="small">mdi-map-marker</v-icon>
                              <div>
                                <div class="text-caption">
                                  {{ (item as any).start ? formatDateTime((item as any).start) : 'N/A' }}
                                </div>
                              </div>
                            </div>
                          </template>
                          
                          <template #item.stop="{ item }">
                            <div class="d-flex align-center">
                              <v-icon class="mr-1" size="small">mdi-map-marker-check</v-icon>
                              <div>
                                <div class="text-caption">
                                  {{ (item as any).stop ? formatDateTime((item as any).stop) : 'N/A' }}
                                </div>
                              </div>
                            </div>
                          </template>
                          
                          <template #item.stopLatitude="{ item }">
                            <span class="text-caption font-mono">
                              {{ typeof (item as any).stopLatitude === 'number' ? (item as any).stopLatitude.toFixed(6) : (item as any).stopLatitude }}
                            </span>
                          </template>
                          
                          <template #item.stopLongitude="{ item }">
                            <span class="text-caption font-mono">
                              {{ typeof (item as any).stopLongitude === 'number' ? (item as any).stopLongitude.toFixed(6) : (item as any).stopLongitude }}
                            </span>
                          </template>
                          
                          <template #item.latLong="{ item }">
                            <div class="d-flex align-center">
                              <span class="text-caption font-mono mr-2">
                                {{ (item as any).latLong }}
                              </span>
                              <v-btn
                                v-if="(item as any).latLong !== 'N/A'"
                                icon="mdi-map"
                                size="x-small"
                                variant="text"
                                color="primary"
                                :href="getGoogleMapsUrl((item as any).latLong)"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <v-icon size="small">mdi-map</v-icon>
                                <v-tooltip activator="parent" location="top">
                                  Open in Google Maps
                                </v-tooltip>
                              </v-btn>
                            </div>
                          </template>
                          
                          <template #item.closestStop="{ item }">
                            <div class="d-flex align-center">
                              <v-icon class="mr-1" size="small">mdi-map-marker-radius</v-icon>
                              <div>
                                <div class="text-body-2">{{ (item as any).closestStop }}</div>
                                <div v-if="(item as any).closestStopAddress !== 'N/A'" class="text-caption text-grey">
                                  {{ (item as any).closestStopAddress }}
                                </div>
                              </div>
                            </div>
                          </template>
                          
                          <template #item.stopDistance="{ item }">
                            <span class="text-body-2">
                              {{ (item as any).stopDistance }}
                            </span>
                          </template>
                          
                          <template #item.distance="{ item }">
                            <span>
                              {{ (item as any).distance ? `${((item as any).distance * 0.621371).toFixed(1)} miles` : 'N/A' }}
                            </span>
                          </template>
                          
                          <template #item.nextTripStart="{ item }">
                            <span class="text-caption">
                              {{ (item as any).nextTripStart ? formatDateTime((item as any).nextTripStart) : 'N/A' }}
                            </span>
                          </template>
                        </v-data-table>
                      </div>
                    </td>
                  </tr>
                </template>
              </v-data-table>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Group Data Section -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-2" icon="mdi-folder-multiple" />
              Geotab Groups
            </div>
            <div class="d-flex align-center gap-3">
              <v-btn
                color="primary"
                prepend-icon="mdi-download"
                variant="elevated"
                :loading="loadingGroupData"
                @click="loadGroupData"
              >
                Import Groups
              </v-btn>
              <v-btn
                color="info"
                prepend-icon="mdi-content-copy"
                variant="outlined"
                :disabled="groupData.length === 0"
                @click="copyGroupNamesToClipboard"
              >
                Copy Names
              </v-btn>
              <v-btn
                color="secondary"
                prepend-icon="mdi-delete"
                variant="outlined"
                :disabled="groupData.length === 0"
                @click="clearGroupData"
              >
                Clear Cache
              </v-btn>
            </div>
          </v-card-title>
          
          <v-card-text>
            <div v-if="loadingGroupData" class="text-center py-8">
              <v-progress-circular
                indeterminate
                color="primary"
              />
              <p class="mt-4">Loading group data...</p>
            </div>
            
            <div v-else-if="groupError" class="text-center py-8">
              <v-icon icon="mdi-alert-circle" color="error" size="48" />
              <p class="text-error mt-4">{{ groupError }}</p>
              <v-btn
                color="primary"
                @click="loadGroupData"
                class="mt-4"
              >
                Try Again
              </v-btn>
            </div>
            
            <div v-else-if="groupData.length === 0" class="text-center py-8 text-grey">
              <v-icon size="48" icon="mdi-folder-multiple" />
              <div class="mt-2">No group data available</div>
              <div class="text-caption">Click "Import Groups" to fetch data from Geotab</div>
            </div>
            
            <div v-else>
              <div class="mb-4 d-flex align-center justify-space-between">
                <div class="text-body-2 text-grey">
                  Found {{ groupData.length }} groups from Geotab
                  <v-chip 
                    v-if="groupDataFromCache" 
                    color="info" 
                    size="small" 
                    class="ml-2"
                  >
                    Cached
                  </v-chip>
                </div>
                <v-text-field
                  v-model="groupSearchQuery"
                  placeholder="Search groups..."
                  variant="outlined"
                  density="compact"
                  style="width: 300px;"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                />
              </div>
              
              <v-data-table
                :headers="groupHeaders"
                :items="filteredGroupData"
                class="elevation-1"
                item-key="groupId"
                :items-per-page="25"
              >
                <template #item.groupName="{ item }">
                  <div class="d-flex align-center">
                    <v-icon class="mr-2" size="small">mdi-folder</v-icon>
                    <span class="font-weight-medium">
                      {{ item.groupName }}
                    </span>
                  </div>
                </template>
                
                <template #item.groupId="{ item }">
                  <code class="text-caption">{{ item.groupId }}</code>
                </template>
              </v-data-table>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Driver Data Section -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-2" icon="mdi-account-group" />
              Geotab Drivers
            </div>
            <div class="d-flex align-center gap-3">
              <v-btn
                color="primary"
                prepend-icon="mdi-download"
                variant="elevated"
                :loading="loadingDriverData"
                @click="loadDriverData"
              >
                Import Drivers
              </v-btn>
              <v-btn
                color="secondary"
                prepend-icon="mdi-delete"
                variant="outlined"
                :disabled="driverData.length === 0"
                @click="clearDriverData"
              >
                Clear Cache
              </v-btn>
            </div>
          </v-card-title>
          
          <v-card-text>
            <div v-if="loadingDriverData" class="text-center py-8">
              <v-progress-circular
                indeterminate
                color="primary"
              />
              <p class="mt-4">Loading driver data...</p>
            </div>
            
            <div v-else-if="driverError" class="text-center py-8">
              <v-icon icon="mdi-alert-circle" color="error" size="48" />
              <p class="text-error mt-4">{{ driverError }}</p>
              <v-btn
                color="primary"
                @click="loadDriverData"
                class="mt-4"
              >
                Try Again
              </v-btn>
            </div>
            
            <div v-else-if="driverData.length === 0" class="text-center py-8 text-grey">
              <v-icon size="48" icon="mdi-account-group" />
              <div class="mt-2">No driver data available</div>
              <div class="text-caption">Click "Import Drivers" to fetch data from Geotab</div>
            </div>
            
            <div v-else>
              <div class="mb-4 d-flex align-center justify-space-between">
                <div class="text-body-2 text-grey">
                  Found {{ driverData.length }} drivers from Geotab
                  <v-chip 
                    v-if="driverDataFromCache" 
                    color="info" 
                    size="small" 
                    class="ml-2"
                  >
                    <v-icon start size="small">mdi-cached</v-icon>
                    Cached
                  </v-chip>
                </div>
              </div>
              
              <!-- Driver search/filter input -->
              <div class="mb-4">
                <v-text-field
                  v-model="driverSearchQuery"
                  prepend-inner-icon="mdi-magnify"
                  label="Filter drivers..."
                  placeholder="Search by name, employee ID, username, license, authority, company, or address"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details
                />
              </div>
              
              <v-data-table
                :headers="driverHeaders"
                :items="filteredDriverData"
                class="elevation-1"
                item-key="id"
                :items-per-page="25"
              >
                <template #item.isArchived="{ item }">
                  <v-chip
                    :color="item.isArchived ? 'warning' : 'success'"
                    size="small"
                    variant="flat"
                  >
                    <v-icon 
                      start 
                      :icon="item.isArchived ? 'mdi-archive' : 'mdi-check-circle'" 
                      size="x-small"
                    />
                    {{ item.isArchived ? 'Archived' : 'Active' }}
                  </v-chip>
                  <div v-if="item.activeTo" class="text-caption text-grey mt-1">
                    Until: {{ new Date(item.activeTo).toLocaleDateString() }}
                  </div>
                </template>
                
                <template #item.fullName="{ item }">
                  <div class="d-flex align-center">
                    <v-icon class="mr-2" size="small">mdi-account</v-icon>
                    <span class="font-weight-medium">
                      {{ item.fullName }}
                    </span>
                  </div>
                </template>
                
                <template #item.employeeId="{ item }">
                  <div class="d-flex align-center">
                    <v-icon class="mr-2" size="small">mdi-badge-account</v-icon>
                    <span class="font-weight-medium">
                      {{ item.employeeId }}
                    </span>
                  </div>
                </template>
                
                <template #item.geotabUsernameId="{ item }">
                  <div class="d-flex flex-column">
                    <span class="text-body-2 text-grey-darken-1">
                      {{ item.geotabUsername || 'N/A' }}
                    </span>
                    <code class="text-caption text-grey">{{ item.id }}</code>
                  </div>
                </template>
                
                <template #item.licenseNumber="{ item }">
                  <div class="d-flex align-center">
                    <v-icon class="mr-2" size="small">mdi-card-account-details</v-icon>
                    <span class="text-body-2">
                      {{ 
                        (item.licenseProvince && item.licenseNumber) 
                          ? `${item.licenseProvince} ${item.licenseNumber}` 
                          : item.licenseNumber || item.licenseProvince || 'N/A' 
                      }}
                    </span>
                  </div>
                </template>
                
                <template #item.authorityName="{ item }">
                  <span class="text-body-2">
                    {{ item.authorityName || 'N/A' }}
                  </span>
                </template>
                
                <template #item.companyName="{ item }">
                  <span class="text-body-2">
                    {{ item.companyName || 'N/A' }}
                  </span>
                </template>
                
                <template #item.companyAddress="{ item }">
                  <span class="text-body-2 text-grey-darken-1">
                    {{ item.companyAddress || 'N/A' }}
                  </span>
                </template>
                
                <template #item.groups="{ item }">
                  <div v-if="item.groups && item.groups.length > 0">
                    <v-chip
                      v-for="group in item.groups"
                      :key="group"
                      size="small"
                      color="primary"
                      variant="outlined"
                      class="ma-1"
                    >
                      <v-icon start icon="mdi-folder" size="x-small" />
                      {{ group }}
                    </v-chip>
                  </div>
                  <span v-else class="text-grey">No groups</span>
                </template>
                
                <template #item.actions="{ item }">
                  <v-btn
                    icon="mdi-code-json"
                    size="small"
                    variant="text"
                    color="primary"
                    @click="openDriverInspectionDialog(item)"
                  >
                    <v-icon size="small">mdi-code-json</v-icon>
                    <v-tooltip activator="parent" location="top">
                      View JSON Data
                    </v-tooltip>
                  </v-btn>
                </template>
              </v-data-table>

              <!-- Summary Tables -->
              <div v-if="companySummary.length > 0 || miscellaneousSummary.duplicateDrivers.length > 0" class="mt-6">
                <v-divider class="mb-4" />
                <v-row>
                  <!-- Company Summary Column -->
                  <v-col cols="6">
                    <h4 class="text-h6 mb-4 d-flex align-center">
                      <v-icon class="mr-2">mdi-domain</v-icon>
                      Company Summary
                      <v-chip size="small" class="ml-2">
                        {{ companySummary.length }} companies
                      </v-chip>
                      <v-spacer />
                      <v-btn
                        icon="mdi-content-copy"
                        size="small"
                        variant="text"
                        color="primary"
                        @click="copyCompanyNamesToClipboard"
                      >
                        <v-icon size="small">mdi-content-copy</v-icon>
                        <v-tooltip activator="parent" location="top">
                          Copy Company Names to Clipboard
                        </v-tooltip>
                      </v-btn>
                    </h4>
                    
                    <v-data-table
                      :headers="companySummaryHeaders"
                      :items="companySummary"
                      class="elevation-1"
                      item-key="companyName"
                      :items-per-page="10"
                      density="compact"
                    >
                      <template #item.companyName="{ item }">
                        <div class="d-flex align-center">
                          <v-icon class="mr-2" size="small">mdi-office-building</v-icon>
                          <span class="font-weight-medium">
                            {{ item.companyName }}
                          </span>
                        </div>
                      </template>
                      
                      <template #item.driverCount="{ item }">
                        <v-chip 
                          :color="item.driverCount > 5 ? 'primary' : item.driverCount > 2 ? 'info' : 'default'"
                          size="small"
                        >
                          {{ item.driverCount }} driver{{ item.driverCount !== 1 ? 's' : '' }}
                        </v-chip>
                      </template>
                    </v-data-table>
                  </v-col>

                  <!-- Miscellaneous Summary Column -->
                  <v-col cols="6">
                    <h4 class="text-h6 mb-4 d-flex align-center">
                      <v-icon class="mr-2">mdi-alert-circle</v-icon>
                      Miscellaneous Summary
                      <v-chip 
                        v-if="miscellaneousSummary.totalDuplicates > 0"
                        size="small" 
                        color="warning"
                        class="ml-2"
                      >
                        {{ miscellaneousSummary.duplicateDrivers.length }} duplicates
                      </v-chip>
                    </h4>
                    
                    <div v-if="miscellaneousSummary.duplicateDrivers.length === 0" class="text-center py-4 text-grey">
                      <v-icon size="48">mdi-check-circle</v-icon>
                      <div class="mt-2">No duplicate license numbers found</div>
                    </div>
                    
                    <v-data-table
                      v-else
                      :headers="miscellaneousHeaders"
                      :items="miscellaneousSummary.duplicateDrivers"
                      class="elevation-1"
                      item-key="licenseNumber"
                      :items-per-page="10"
                      density="compact"
                    >
                      <template #item.licenseNumber="{ item }">
                        <div class="d-flex align-center">
                          <v-icon class="mr-2" size="small" color="warning">mdi-card-account-details</v-icon>
                          <span class="font-weight-medium">
                            {{ item.licenseNumber }}
                          </span>
                        </div>
                      </template>
                      
                      <template #item.count="{ item }">
                        <v-chip 
                          color="warning"
                          size="small"
                        >
                          {{ item.count }} drivers
                        </v-chip>
                      </template>
                      
                      <template #item.names="{ item }">
                        <div class="text-body-2">
                          <div v-for="driver in item.drivers.slice(0, 2)" :key="driver.id" class="text-truncate">
                            {{ driver.fullName }}
                          </div>
                          <div v-if="item.drivers.length > 2" class="text-caption text-grey">
                            +{{ item.drivers.length - 2 }} more
                          </div>
                        </div>
                      </template>
                    </v-data-table>
                  </v-col>
                </v-row>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Geotab Devices Section -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-2" icon="mdi-truck" />
              Geotab Devices
            </div>
            <div class="d-flex align-center gap-3">
              <v-btn
                color="primary"
                prepend-icon="mdi-download"
                variant="elevated"
                :loading="loadingDeviceData"
                @click="loadDeviceData"
              >
                Import Devices
              </v-btn>
              <v-btn
                color="secondary"
                prepend-icon="mdi-delete"
                variant="outlined"
                :disabled="deviceData.length === 0"
                @click="clearDeviceData"
              >
                Clear Cache
              </v-btn>
            </div>
          </v-card-title>
          
          <v-card-text>
            <div v-if="loadingDeviceData" class="text-center py-8">
              <v-progress-circular
                indeterminate
                color="primary"
              />
              <p class="mt-4">Loading device data...</p>
            </div>
            
            <div v-else-if="deviceError" class="text-center py-8">
              <v-icon icon="mdi-alert-circle" color="error" size="48" />
              <p class="text-error mt-4">{{ deviceError }}</p>
              <v-btn
                color="primary"
                @click="loadDeviceData"
                class="mt-4"
              >
                Try Again
              </v-btn>
            </div>
            
            <div v-else-if="deviceData.length === 0" class="text-center py-8 text-grey">
              <v-icon size="48" icon="mdi-truck" />
              <div class="mt-2">No device data available</div>
              <div class="text-caption">Click "Import Devices" to fetch data from Geotab</div>
            </div>
            
            <div v-else>
              <div class="mb-4 d-flex align-center justify-space-between">
                <div class="text-body-2 text-grey">
                  Found {{ deviceDuplicateSummary.truckCount }} trucks + {{ deviceDuplicateSummary.plateOnlyCount }} license-only entries ({{ deviceData.length }} total device entries) from Geotab
                  <v-chip 
                    v-if="deviceDataFromCache" 
                    color="info" 
                    size="small" 
                    class="ml-2"
                  >
                    <v-icon start size="small">mdi-cached</v-icon>
                    Cached
                  </v-chip>
                </div>
                
                <!-- Toggle for showing all vs filtered -->
                <v-switch
                  v-model="showAllDevices"
                  label="Show all devices"
                  color="primary"
                  hide-details
                  density="compact"
                />
              </div>
              
              <!-- Device search/filter input -->
              <div class="mb-4">
                <v-text-field
                  v-model="deviceSearchQuery"
                  prepend-inner-icon="mdi-magnify"
                  label="Filter devices..."
                  placeholder="Search by truck number, VIN, license plate, or Geotab ID"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details
                />
              </div>
              
              <div class="mb-4 text-body-2 text-grey">
                Showing {{ filteredDeviceData.length }} of {{ deviceData.length }} devices
                <span v-if="!showAllDevices">(filtered to devices with name, VIN, and license plate)</span>
              </div>
              
              <v-data-table
                :headers="deviceHeaders"
                :items="filteredDeviceData"
                class="elevation-1"
                item-key="id"
                :items-per-page="25"
              >
                <template #item.isArchived="{ item }">
                  <v-chip
                    :color="item.isArchived ? 'warning' : 'success'"
                    size="small"
                    variant="flat"
                  >
                    <v-icon 
                      start 
                      :icon="item.isArchived ? 'mdi-archive' : 'mdi-check-circle'" 
                      size="x-small"
                    />
                    {{ item.isArchived ? 'Archived' : 'Active' }}
                  </v-chip>
                  <div v-if="item.activeTo" class="text-caption text-grey mt-1">
                    Until: {{ new Date(item.activeTo).toLocaleDateString() }}
                  </div>
                </template>
                
                <template #item.groupType="{ item }">
                  <v-icon 
                    :icon="item.groupType === 'truck' ? 'mdi-truck' : 'mdi-card-text'"
                    :color="item.groupType === 'truck' ? 'primary' : 'info'"
                    size="small"
                  >
                    <v-tooltip activator="parent" location="top">
                      {{ item.groupType === 'truck' ? 'Truck Number' : 'License Plate Only' }}
                    </v-tooltip>
                  </v-icon>
                </template>
                
                <template #item.truckNumber="{ item }">
                  <span :class="item.truckNumber ? 'font-weight-medium' : 'text-grey'">
                    {{ item.truckNumber || 'N/A' }}
                  </span>
                </template>
                
                <template #item.vin="{ item }">
                  <span class="text-body-2">
                    {{ item.vin || 'N/A' }}
                  </span>
                </template>
                
                <template #item.licensePlate="{ item }">
                  <div v-if="item.licensePlates && item.licensePlates.length > 1">
                    <div v-for="plate in item.licensePlates" :key="plate" class="text-caption mb-1">
                      <v-icon class="mr-1" size="x-small">mdi-card-account-details</v-icon>
                      {{ plate }}
                    </div>
                  </div>
                  <div v-else class="d-flex align-center">
                    <v-icon class="mr-2" size="small">mdi-card-account-details</v-icon>
                    <span class="text-body-2">
                      {{ item.licensePlate !== 'N/A' ? item.licensePlate : 'N/A' }}
                    </span>
                  </div>
                </template>
                
                <template #item.geotabId="{ item }">
                  <div v-if="item.entryCount > 1" class="text-caption">
                    <div v-for="(id, index) in item.geotabIds" :key="id" class="mb-1">
                      <code>{{ id }}</code>
                    </div>
                  </div>
                  <code v-else class="text-caption">{{ item.geotabId }}</code>
                </template>
                
                <template #item.entryCount="{ item }">
                  <v-chip 
                    :color="item.entryCount > 1 ? 'warning' : 'success'"
                    size="small"
                  >
                    {{ item.entryCount }}
                  </v-chip>
                </template>
                
                <template #item.groups="{ item }">
                  <div v-if="item.groups && item.groups.length > 0">
                    <v-chip
                      v-for="group in item.groups"
                      :key="group"
                      size="small"
                      color="primary"
                      variant="outlined"
                      class="ma-1"
                    >
                      <v-icon start icon="mdi-folder" size="x-small" />
                      {{ group }}
                    </v-chip>
                  </div>
                  <span v-else class="text-grey">No groups</span>
                </template>
                
                <template #item.actions="{ item }">
                  <v-btn
                    icon="mdi-code-json"
                    size="small"
                    variant="text"
                    color="primary"
                    @click="openDeviceInspectionDialog(item)"
                  >
                    <v-icon size="small">mdi-code-json</v-icon>
                    <v-tooltip activator="parent" location="top">
                      View JSON Data
                    </v-tooltip>
                  </v-btn>
                </template>
              </v-data-table>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Device Summary Section -->
    <v-row v-if="deviceData.length > 0" class="mb-6">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" icon="mdi-map-marker" />
            Devices by State
          </v-card-title>
          <v-card-text>
            <div v-if="deviceStateSummary.length === 0" class="text-center py-4 text-grey">
              No state information available
            </div>
            <div v-else>
              <div
                v-for="{ state, count } in deviceStateSummary"
                :key="state"
                class="d-flex justify-space-between align-center py-2 border-b"
              >
                <div class="d-flex align-center">
                  <v-chip
                    :color="state === 'Unknown' ? 'grey' : 'primary'"
                    variant="outlined"
                    size="small"
                    class="mr-3"
                  >
                    {{ state === 'Unknown' ? '???' : state }}
                  </v-chip>
                  <span>{{ state === 'Unknown' ? 'No State Info' : state }}</span>
                </div>
                <v-chip color="info" size="small">{{ count }}</v-chip>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" icon="mdi-content-duplicate" />
            Duplicate Detection
          </v-card-title>
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-subtitle-2">Items with Multiple Geotab Entries</span>
              <v-chip 
                :color="deviceDuplicateSummary.duplicateItems.length > 0 ? 'warning' : 'success'"
                size="small"
              >
                {{ deviceDuplicateSummary.duplicateItems.length }}
              </v-chip>
            </div>
            <div v-if="deviceDuplicateSummary.duplicateItems.length === 0" class="text-center py-4 text-grey">
              <v-icon icon="mdi-check-circle" color="success" size="32" />
              <div class="mt-2">All items have single Geotab entries</div>
              <div class="text-caption">Each truck/license appears once</div>
            </div>
            <div v-else>
              <div class="text-warning mb-3">
                <v-icon icon="mdi-alert" class="mr-1" />
                {{ deviceDuplicateSummary.duplicateItems.length }} items have multiple Geotab entries
                ({{ deviceDuplicateSummary.totalDuplicateEntries }} total entries)
              </div>
              <div class="text-caption mb-3">
                Summary: {{ deviceDuplicateSummary.truckCount }} trucks + {{ deviceDuplicateSummary.plateOnlyCount }} license-only = {{ deviceDuplicateSummary.uniqueItemCount }} unique items from {{ deviceDuplicateSummary.totalDeviceEntries }} device entries
              </div>
              
              <div v-if="deviceDuplicateSummary.duplicateTruckNumbers.length > 0" class="mb-4">
                <div class="text-subtitle-3 mb-2 d-flex align-center">
                  <v-icon icon="mdi-truck" size="small" class="mr-1" />
                  Truck Number Duplicates ({{ deviceDuplicateSummary.duplicateTruckNumbers.length }})
                </div>
                <div
                  v-for="truck in deviceDuplicateSummary.duplicateTruckNumbers"
                  :key="truck.primaryKey"
                  class="border rounded pa-2 mb-2 bg-amber-lighten-5"
                >
                  <div class="d-flex justify-space-between align-center mb-1">
                    <span class="font-weight-medium">{{ truck.truckNumber }}</span>
                    <v-chip color="warning" size="x-small">{{ truck.entryCount }} entries</v-chip>
                  </div>
                  <div class="text-caption text-grey">
                    Geotab IDs: {{ truck.geotabIds.join(', ') }}
                  </div>
                </div>
              </div>
              
              <div v-if="deviceDuplicateSummary.duplicateLicensePlates.length > 0">
                <div class="text-subtitle-3 mb-2 d-flex align-center">
                  <v-icon icon="mdi-card-text" size="small" class="mr-1" />
                  License Plate Duplicates ({{ deviceDuplicateSummary.duplicateLicensePlates.length }})
                </div>
                <div
                  v-for="plate in deviceDuplicateSummary.duplicateLicensePlates"
                  :key="plate.primaryKey"
                  class="border rounded pa-2 mb-2 bg-blue-lighten-5"
                >
                  <div class="d-flex justify-space-between align-center mb-1">
                    <span class="font-weight-medium">{{ plate.licensePlate }}</span>
                    <v-chip color="info" size="x-small">{{ plate.entryCount }} entries</v-chip>
                  </div>
                  <div class="text-caption text-grey">
                    Geotab IDs: {{ plate.geotabIds.join(', ') }}
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Real-time Fleet Tracking Card -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-3">
              <div class="d-flex align-center">
                <v-icon class="mr-2" icon="mdi-map-marker-radius" />
                Real-time Fleet Tracking
              </div>
              <div v-if="pollingStatus.isPolling && nextSnapshotCountdown" class="text-caption text-grey">
                <v-icon size="small" icon="mdi-timer-outline" class="mr-1" />
                Next: {{ nextSnapshotCountdown }}
              </div>
            </div>
            <div class="d-flex align-center gap-3">
              <v-btn
                color="secondary"
                prepend-icon="mdi-download"
                variant="outlined"
                :loading="loadingRealTime"
                @click="refreshRealTimeData(true)"
              >
                Force Fresh Data
              </v-btn>
              <v-select
                v-model="selectedSnapshot"
                :items="snapshotDropdownItems"
                item-title="label"
                item-value="value"
                label="Select Snapshot"
                variant="outlined"
                density="compact"
                style="min-width: 200px"
                @update:model-value="onSnapshotSelected"
              >
                <template #prepend-inner>
                  <v-icon size="small" icon="mdi-camera-burst" />
                </template>
              </v-select>
              <v-chip
                :color="realTimeData.length > 0 ? 'success' : 'grey'"
                size="small"
              >
                {{ realTimeData.length }} vehicles
              </v-chip>
            </div>
          </v-card-title>
          
          <v-card-subtitle v-if="lastUpdateTime" class="text-caption text-grey">
            Last snapshot: {{ new Date(lastUpdateTime).toLocaleString() }}
          </v-card-subtitle>
          
          <v-card-text>
            <!-- Search Field -->
            <div class="mb-4">
              <v-text-field
                v-model="searchQuery"
                label="Search by Truck ID or Driver Name"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </div>

            <div v-if="loadingRealTime" class="text-center py-8">
              <v-progress-circular
                indeterminate
                color="primary"
              />
              <p class="mt-4">Loading real-time fleet data...</p>
            </div>
            
            <div v-else-if="realTimeError" class="text-center py-8">
              <v-icon icon="mdi-alert-circle" color="error" size="48" />
              <p class="text-error mt-4">{{ realTimeError }}</p>
              <v-btn
                color="primary"
                @click="refreshRealTimeData"
                class="mt-4"
              >
                Try Again
              </v-btn>
            </div>
            
            <div v-else>
              <v-data-table
                :headers="realTimeHeaders"
                :items="sortedRealTimeData"
                :loading="loadingRealTime"
                class="elevation-1"
                item-key="truckID"
              >
                <template #item.location="{ item }">
                  <span :class="item.location === 'N/A' ? 'text-grey' : ''">
                    {{ item.location }}
                  </span>
                </template>
                
                <template #item.speed="{ item }">
                  <span :class="item.speed === 'N/A' ? 'text-grey' : ''">
                    {{ item.speed }}
                  </span>
                </template>
                
                <template #item.bearing="{ item }">
                  <span :class="item.bearing === 'N/A' ? 'text-grey' : ''">
                    {{ item.bearing }}
                  </span>
                </template>
                
                <template #item.driver="{ item }">
                  <div v-if="item.driverInfo">
                    <div class="text-body-2">{{ item.driverInfo.firstName }} {{ item.driverInfo.lastName }}</div>
                    <div v-if="item.driverInfo.employeeNo" class="text-caption text-grey">
                      {{ item.driverInfo.employeeNo }}
                    </div>
                  </div>
                  <span v-else class="text-grey">No driver</span>
                </template>
                
                <template #item.isDriving="{ item }">
                  <v-icon
                    :icon="item.isDriving ? 'mdi-check-circle' : 'mdi-close-circle'"
                    :color="item.isDriving ? 'success' : 'error'"
                  />
                </template>
                
                <template #item.actions="{ item }">
                  <div class="d-flex gap-1">
                    <v-btn
                      icon="mdi-magnify"
                      size="small"
                      variant="text"
                      color="primary"
                      density="compact"
                      @click="openHistoryDialog(item, 'vehicle')"
                      :disabled="!item.truckID"
                    >
                      <v-icon>mdi-truck</v-icon>
                      <v-tooltip activator="parent" location="top">
                        View Vehicle History
                      </v-tooltip>
                    </v-btn>
                    <v-btn
                      icon="mdi-magnify"
                      size="small"
                      variant="text"
                      color="secondary"
                      density="compact"
                      @click="openHistoryDialog(item, 'driver')"
                      :disabled="!item.driverInfo"
                    >
                      <v-icon>mdi-account</v-icon>
                      <v-tooltip activator="parent" location="top">
                        View Driver History
                      </v-tooltip>
                    </v-btn>
                  </div>
                </template>
              </v-data-table>
            </div>
          </v-card-text>
          
          <v-card-actions>
            <v-spacer />
            <small class="text-grey">
              Last updated: {{ lastUpdateTime ? new Date(lastUpdateTime).toLocaleTimeString() : 'Never' }}
            </small>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- History Dialog -->
    <v-dialog v-model="historyDialog" max-width="1200" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" :icon="historyTarget.type === 'driver' ? 'mdi-account' : 'mdi-truck'" />
          {{ historyTarget.type === 'driver' ? 'Driver' : 'Vehicle' }} History: {{ historyTarget.name }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="historyDialog = false" />
        </v-card-title>
        
        <v-card-text>
          <div v-if="historyLoading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" />
            <div class="mt-2">Searching through all snapshots...</div>
          </div>
          
          <div v-else-if="historyData.length === 0" class="text-center py-8 text-grey">
            <v-icon size="48" icon="mdi-history" />
            <div class="mt-2">No historical data found for this {{ historyTarget.type }}</div>
          </div>
          
          <div v-else>
            <div class="mb-4 text-body-2 text-grey">
              Found {{ historyData.length }} historical records
            </div>
            
            <v-data-table
              :headers="historyHeaders"
              :items="historyData"
              class="elevation-1"
              item-key="dateTime"
              :items-per-page="25"
            >
              <template #item.driver="{ item }">
                <span :class="item.driver === 'No driver' ? 'text-grey' : ''">
                  {{ item.driver }}
                </span>
              </template>
              
              <template #item.vehicle="{ item }">
                <span :class="item.vehicle === 'Unknown Vehicle' ? 'text-grey' : ''">
                  {{ item.vehicle }}
                </span>
              </template>
              
              <template #item.location="{ item }">
                <span :class="item.location === 'N/A' ? 'text-grey' : ''">
                  {{ item.location }}
                </span>
              </template>
              
              <template #item.speed="{ item }">
                <span :class="item.speed === 'N/A' ? 'text-grey' : ''">
                  {{ item.speed }}
                </span>
              </template>
              
              <template #item.bearing="{ item }">
                <span :class="item.bearing === 'N/A' ? 'text-grey' : ''">
                  {{ item.bearing }}
                </span>
              </template>
              
              <template #item.isDriving="{ item }">
                <v-icon
                  :icon="item.isDriving ? 'mdi-check-circle' : 'mdi-close-circle'"
                  :color="item.isDriving ? 'success' : 'error'"
                />
              </template>
            </v-data-table>
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="historyDialog = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Trip Data Inspection Dialog -->
    <v-dialog
      v-model="tripInspectionDialog"
      max-width="800px"
      scrollable
    >
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-code-json</v-icon>
            <span class="font-weight-bold text-h6">Trip Data Inspection</span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="tripInspectionDialog = false"
          />
        </v-card-title>

        <v-card-text class="pa-6">
          <div v-if="selectedTripData">
            <v-textarea
              :model-value="JSON.stringify(selectedTripData, null, 2)"
              readonly
              variant="outlined"
              rows="20"
              class="font-mono"
              label="Raw Trip Data (JSON)"
              hide-details
            />
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn 
            color="primary" 
            variant="outlined"
            @click="copyTripDataToClipboard"
          >
            <v-icon class="mr-1">mdi-content-copy</v-icon>
            Copy to Clipboard
          </v-btn>
          <v-btn color="primary" @click="tripInspectionDialog = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Driver Data Inspection Dialog -->
    <v-dialog
      v-model="driverInspectionDialog"
      max-width="800px"
      scrollable
    >
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-code-json</v-icon>
            <span class="font-weight-bold text-h6">Driver Data Inspection</span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="driverInspectionDialog = false"
          />
        </v-card-title>

        <v-card-text class="pa-6">
          <div v-if="selectedDriverData">
            <v-textarea
              :model-value="JSON.stringify(selectedDriverData, null, 2)"
              readonly
              variant="outlined"
              rows="20"
              class="font-mono"
              label="Raw Driver Data (JSON)"
              hide-details
            />
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn 
            color="primary" 
            variant="outlined"
            @click="copyDriverDataToClipboard"
          >
            <v-icon class="mr-1">mdi-content-copy</v-icon>
            Copy to Clipboard
          </v-btn>
          <v-btn color="primary" @click="driverInspectionDialog = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Device Data Inspection Dialog -->
    <v-dialog
      v-model="deviceInspectionDialog"
      max-width="800px"
      scrollable
    >
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-code-json</v-icon>
            <span class="font-weight-bold text-h6">Device Data Inspection</span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="deviceInspectionDialog = false"
          />
        </v-card-title>

        <v-card-text class="pa-6">
          <div v-if="selectedDeviceData">
            <v-textarea
              :model-value="JSON.stringify(selectedDeviceData, null, 2)"
              readonly
              variant="outlined"
              rows="20"
              class="font-mono"
              label="Raw Device Data (JSON)"
              hide-details
            />
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn 
            color="primary" 
            variant="outlined"
            @click="copyDeviceDataToClipboard"
          >
            <v-icon class="mr-1">mdi-content-copy</v-icon>
            Copy to Clipboard
          </v-btn>
          <v-btn color="primary" @click="deviceInspectionDialog = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()

  // Reactive data
  const loadingRealTime = ref(false)
  const realTimeData = ref<any[]>([])
  const realTimeError = ref('')
  const lastUpdateTime = ref<string | null>(null)
  const geotabStatus = ref<any>({
    isAuthenticated: false,
    database: '',
    username: '',
    lastAuthenticated: null
  })

  // Trip data
  const loadingTripData = ref(false)
  const tripData = ref<any[]>([])
  const tripError = ref('')
  const selectedTripDate = ref('')
  const tripDataFromCache = ref(false)
  const expandedRows = ref<string[]>([])
  const stopsData = ref<any[]>([])

  // Group data
  const loadingGroupData = ref(false)
  const groupData = ref<any[]>([])
  const groupError = ref('')
  const groupDataFromCache = ref(false)
  const groupSearchQuery = ref('')
  
  // Driver data
  const loadingDriverData = ref(false)
  const driverData = ref<any[]>([])
  const driverError = ref('')
  const driverDataFromCache = ref(false)
  const driverSearchQuery = ref('')

  // Device data
  const loadingDeviceData = ref(false)
  const deviceData = ref<any[]>([])
  const deviceError = ref('')
  const deviceDataFromCache = ref(false)
  const deviceSearchQuery = ref('')
  const showAllDevices = ref(false)

  // Search functionality
  const searchQuery = ref('')

  // Update database functionality
  const updatingDatabase = ref(false)

  // History dialog data
  const historyDialog = ref(false)
  const historyLoading = ref(false)
  const historyData = ref<any[]>([])

  // Trip inspection dialog data
  const tripInspectionDialog = ref(false)
  const selectedTripData = ref<any>(null)

  // Driver inspection dialog data
  const driverInspectionDialog = ref(false)
  const selectedDriverData = ref<any>(null)

  // Device inspection dialog data
  const deviceInspectionDialog = ref(false)
  const selectedDeviceData = ref<any>(null)

  // Function to open trip inspection dialog
  const openTripInspectionDialog = (tripData: any) => {
    selectedTripData.value = tripData
    tripInspectionDialog.value = true
  }

  // Function to copy trip data to clipboard
  const copyTripDataToClipboard = async () => {
    if (selectedTripData.value) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(selectedTripData.value, null, 2))
        // You might want to add a toast notification here
        console.log('Trip data copied to clipboard')
      } catch (error) {
        console.error('Failed to copy trip data to clipboard:', error)
      }
    }
  }

  // Function to generate Google Maps URL from lat/long string
  const getGoogleMapsUrl = (latLong: string): string => {
    if (!latLong || latLong === 'N/A') {
      return ''
    }
    
    // Parse the lat/long string (format: "lat, lng")
    const coords = latLong.split(',').map(coord => coord.trim())
    if (coords.length !== 2) {
      return ''
    }
    
    const lat = parseFloat(coords[0])
    const lng = parseFloat(coords[1])
    
    if (isNaN(lat) || isNaN(lng)) {
      return ''
    }
    
    return `https://www.google.com/maps/@${lat},${lng},15z`
  }
  const historyTarget = ref<{ type: 'driver' | 'vehicle', name: string, id?: string }>({ type: 'driver', name: '' })

  // Snapshot browser data
  const loadingSnapshots = ref(false)
  const availableSnapshots = ref<{ recordedAt: string, count: number }[]>([])
  const selectedSnapshot = ref<string>('latest')
  const pollingStatus = ref<{ isPolling: boolean, lastSnapshot?: Date, nextSnapshot?: Date, intervalMinutes: number }>({
    isPolling: false,
    intervalMinutes: 10
  })
  const nextSnapshotCountdown = ref('')
  let countdownInterval: NodeJS.Timeout | null = null

  // Trip data table headers for grouped view
  const tripHeaders = [
    { title: '', value: 'data-table-expand', sortable: false },
    { title: 'Truck ID', value: 'truckID', sortable: true },
    { title: 'Driver', value: 'driver', sortable: true },
    { title: 'Total Stops', value: 'tripCount', sortable: true },
    { title: 'Total Distance', value: 'totalDistance', sortable: true },
    { title: 'Date Range', value: 'dateRange', sortable: true }
  ]

  // Sub-table headers for individual trips
  const tripDetailHeaders = [
    { title: '', value: 'inspect', sortable: false },
    { title: 'Start Time', value: 'start', sortable: true },
    { title: 'Stop Time', value: 'stop', sortable: true },
    { title: 'Lat/Long', value: 'latLong', sortable: true },
    { title: 'Closest Stop', value: 'closestStop', sortable: true },
    { title: 'Stop Distance', value: 'stopDistance', sortable: true },
    { title: 'Distance', value: 'distance', sortable: true },
    { title: 'Next Trip Start', value: 'nextTripStart', sortable: true }
  ]

  // Group data table headers
  const groupHeaders = [
    { title: 'Group Name', value: 'groupName', sortable: true },
    { title: 'Group ID', value: 'groupId', sortable: true }
  ]

  // Driver data table headers
  const driverHeaders = [
    { title: 'Status', value: 'isArchived', sortable: true },
    { title: 'Full Name', value: 'fullName', sortable: true },
    { title: 'Employee ID', value: 'employeeId', sortable: true },
    { title: 'Geotab Username / ID', value: 'geotabUsernameId', sortable: true },
    { title: 'License Number', value: 'licenseNumber', sortable: true },
    { title: 'Authority', value: 'authorityName', sortable: true },
    { title: 'Company', value: 'companyName', sortable: true },
    { title: 'Company Address', value: 'companyAddress', sortable: true },
    { title: 'Groups', value: 'groups', sortable: true },
    { title: 'Actions', value: 'actions', sortable: false }
  ]

  // Company summary table headers
  const companySummaryHeaders = [
    { title: 'Company Name', value: 'companyName', sortable: true },
    { title: 'Driver Count', value: 'driverCount', sortable: true }
  ]

  // Miscellaneous summary table headers
  const miscellaneousHeaders = [
    { title: 'License Number', value: 'licenseNumber', sortable: true },
    { title: 'Count', value: 'count', sortable: true },
    { title: 'Driver Names', value: 'names', sortable: false }
  ]

  // Device data table headers
  const deviceHeaders = [
    { title: 'Status', value: 'isArchived', sortable: true },
    { title: 'Type', value: 'groupType', sortable: true },
    { title: 'Truck Number', value: 'truckNumber', sortable: true },
    { title: 'VIN', value: 'vin', sortable: true },
    { title: 'License Plate', value: 'licensePlate', sortable: true },
    { title: 'Geotab IDs', value: 'geotabId', sortable: true },
    { title: 'Entries', value: 'entryCount', sortable: true },
    { title: 'Groups', value: 'groups', sortable: true },
    { title: 'Actions', value: 'actions', sortable: false }
  ]

  // Real-time fleet data table headers
  const realTimeHeaders = [
    { title: 'Truck ID', value: 'truckID', sortable: true },
    { title: 'Driver', value: 'driver', sortable: true },
    { title: 'Location', value: 'location', sortable: false },
    { title: 'Speed', value: 'speed', sortable: true },
    { title: 'Bearing', value: 'bearing', sortable: true },
    { title: 'Driving', value: 'isDriving', sortable: true },
    { title: 'Actions', value: 'actions', sortable: false }
  ]

  // History dialog table headers - computed to show different columns based on type
  const historyHeaders = computed(() => {
    const baseHeaders = [
      { title: 'Date/Time', value: 'dateTime', sortable: true },
      { title: 'Location', value: 'location', sortable: false },
      { title: 'Speed', value: 'speed', sortable: true },
      { title: 'Bearing', value: 'bearing', sortable: true },
      { title: 'Driving', value: 'isDriving', sortable: true }
    ]
    
    if (historyTarget.value.type === 'vehicle') {
      // For vehicle history, show the driver
      baseHeaders.splice(1, 0, { title: 'Driver', value: 'driver', sortable: true })
    } else if (historyTarget.value.type === 'driver') {
      // For driver history, show the vehicle
      baseHeaders.splice(1, 0, { title: 'Vehicle', value: 'vehicle', sortable: true })
    }
    
    return baseHeaders
  })

  // Computed
  const snapshotDropdownItems = computed(() => {
    const items = [
      { label: 'Latest Data', value: 'latest' }
    ]
    
    // Add last 20 snapshots
    const snapshots = availableSnapshots.value.slice(0, 20)
    snapshots.forEach(snapshot => {
      const date = new Date(snapshot.recordedAt)
      const label = `${date.toLocaleDateString()} ${date.toLocaleTimeString()} (${snapshot.count} vehicles)`
      items.push({
        label,
        value: snapshot.recordedAt
      })
    })
    
    return items
  })

  const filteredRealTimeData = computed(() => {
    if (!searchQuery.value.trim()) {
      return realTimeData.value
    }
    
    const query = searchQuery.value.toLowerCase().trim()
    return realTimeData.value.filter((item) => {
      const truckID = (item.truckID || '').toLowerCase()
      const driverName = item.driverInfo 
        ? `${item.driverInfo.firstName || ''} ${item.driverInfo.lastName || ''}`.toLowerCase().trim()
        : (item.driver || '').toLowerCase()
      
      return truckID.includes(query) || driverName.includes(query)
    })
  })

  const sortedRealTimeData = computed(() => {
    return [...filteredRealTimeData.value].sort((a, b) => {
      // Sort by isDriving first (driving vehicles first)
      if (a.isDriving !== b.isDriving) {
        return a.isDriving ? -1 : 1
      }
      // Then sort by truckID
      return a.truckID.localeCompare(b.truckID)
    })
  })

  // Grouped trip data computed property
  const groupedTripData = computed(() => {
    if (!tripData.value || tripData.value.length === 0) {
      return []
    }

    // Get the selected date for filtering (force UTC to avoid timezone issues)
    const selectedDate = selectedTripDate.value ? new Date(selectedTripDate.value + 'T00:00:00.000Z') : null
    const selectedDateStart = selectedDate ? new Date(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate()) : null
    const selectedDateEnd = selectedDate ? new Date(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate() + 1) : null

    // Filter trips with comprehensive criteria
    const filteredTrips = tripData.value.filter(trip => {
      // Include all trips regardless of driver status
      // If truck ID matches for that day, it should be part of the trip data

      // Parse start and stop times
      const startTime = trip.start ? new Date(trip.start) : null
      const stopTime = trip.stop ? new Date(trip.stop) : null

      // Filter out trips that don't have valid start/stop times
      if (!startTime || !stopTime) {
        return false
      }

      // Filter trips to only include those within the selected date
      // Both start and stop times must be within the selected date
      if (selectedDateStart && selectedDateEnd) {
        // Check if start time is within the selected date
        if (startTime < selectedDateStart || startTime >= selectedDateEnd) {
          return false
        }
        // Check if stop time is within the selected date  
        if (stopTime < selectedDateStart || stopTime >= selectedDateEnd) {
          return false
        }
      }

      // Calculate trip duration in minutes
      const durationMinutes = (stopTime.getTime() - startTime.getTime()) / (1000 * 60)
      if (durationMinutes < 5) {
        return false
      }

      // Keep all trips including 0 distance (removed filter)
      // const distance = trip.distance || 0
      // if (distance <= 0) {
      //   return false
      // }

      return true
    })

    // Enhance trips with stop point coordinates (closest stop will be added after API call)
    const enhancedTrips = filteredTrips.map(trip => {
      const lat = trip.stopPoint?.y || 'N/A'
      const lng = trip.stopPoint?.x || 'N/A'
      return {
        ...trip,
        stopLatitude: lat,
        stopLongitude: lng,
        latLong: lat !== 'N/A' && lng !== 'N/A' ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}` : 'N/A'
      }
    })

    // Group by device/driver combination
    const groups = new Map<string, any[]>()
    
    for (const trip of enhancedTrips) {
      const truckID = trip.truckID || trip.deviceInfo?.truckID || trip.device?.name || 'Unknown Device'
      const driverName = trip.driverName || trip.driverInfo?.driver || trip.driver?.name || 'Unknown Driver'
      const key = `${truckID}|${driverName}`
      
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(trip)
    }

    // Convert to array format for data table
    const result: any[] = []
    for (const [key, trips] of groups.entries()) {
      const [truckID, driverName] = key.split('|')
      
      // Calculate totals (convert km to miles: 1 km = 0.621371 miles)
      const totalDistance = trips.reduce((sum, trip) => {
        const distance = trip.distance || 0
        const distanceInMiles = typeof distance === 'number' ? distance * 0.621371 : 0
        return sum + distanceInMiles
      }, 0)
      
      // Get date range
      const dates = trips
        .map(trip => trip.start ? new Date(trip.start) : null)
        .filter(date => date !== null)
        .sort((a, b) => a!.getTime() - b!.getTime())
      
      const dateRange = dates.length > 0 
        ? dates.length === 1
          ? dates[0]!.toLocaleDateString()
          : `${dates[0]!.toLocaleDateString()} - ${dates[dates.length - 1]!.toLocaleDateString()}`
        : 'N/A'
      
      result.push({
        id: key,
        truckID,
        driver: driverName,
        tripCount: trips.length,
        totalDistance: totalDistance > 0 ? `${totalDistance.toFixed(1)} miles` : 'N/A',
        dateRange,
        trips: trips.sort((a, b) => {
          const aDate = a.start ? new Date(a.start) : new Date(0)
          const bDate = b.start ? new Date(b.start) : new Date(0)
          return aDate.getTime() - bDate.getTime()
        }),
        enriched: trips.some(trip => trip.enriched)
      })
    }

    // Sort by truck ID then driver name
    return result.sort((a, b) => {
      const truckCompare = a.truckID.localeCompare(b.truckID)
      return truckCompare !== 0 ? truckCompare : a.driver.localeCompare(b.driver)
    })
  })

  // Filtered driver data computed property
  const filteredGroupData = computed(() => {
    let filtered = groupData.value

    if (groupSearchQuery.value.trim()) {
      const query = groupSearchQuery.value.toLowerCase()
      filtered = filtered.filter(group =>
        (group.groupName || '').toLowerCase().includes(query) ||
        (group.groupId || '').toLowerCase().includes(query)
      )
    }

    return filtered
  })

  const filteredDriverData = computed(() => {
    if (!driverData.value || driverData.value.length === 0) {
      return []
    }
    
    let filtered = driverData.value
    
    if (driverSearchQuery.value.trim()) {
      const query = driverSearchQuery.value.toLowerCase().trim()
      filtered = driverData.value.filter((driver) => {
        // Search through all visible fields
        const fullName = (driver.fullName || '').toLowerCase()
        const employeeId = (driver.employeeId || '').toLowerCase()
        const geotabUsername = (driver.geotabUsername || '').toLowerCase()
        const licenseNumber = (driver.licenseNumber || '').toLowerCase()
        const licenseProvince = (driver.licenseProvince || '').toLowerCase()
        const authorityName = (driver.authorityName || '').toLowerCase()
        const companyName = (driver.companyName || '').toLowerCase()
        const companyAddress = (driver.companyAddress || '').toLowerCase()
        const id = (driver.id || '').toLowerCase()
        
        return fullName.includes(query) || 
               employeeId.includes(query) || 
               geotabUsername.includes(query) ||
               licenseNumber.includes(query) ||
             licenseProvince.includes(query) ||
             authorityName.includes(query) ||
             companyName.includes(query) ||
             companyAddress.includes(query) ||
             id.includes(query)
      })
    }
    
    // Sort with archived drivers at the bottom
    return filtered.sort((a, b) => {
      // Archived drivers last
      if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1
      
      // Then sort alphabetically by full name
      return (a.fullName || '').localeCompare(b.fullName || '')
    })
  })

  // Company summary computed property
  const companySummary = computed(() => {
    if (!filteredDriverData.value || filteredDriverData.value.length === 0) {
      return []
    }
    
    // Count drivers by company name
    const companyCount = new Map<string, number>()
    
    filteredDriverData.value.forEach(driver => {
      const companyName = driver.companyName || 'Unknown Company'
      companyCount.set(companyName, (companyCount.get(companyName) || 0) + 1)
    })
    
    // Convert to array and sort by driver count (descending), then by company name
    return Array.from(companyCount.entries())
      .map(([companyName, driverCount]) => ({
        companyName,
        driverCount
      }))
      .sort((a, b) => {
        // First sort by driver count (descending)
        if (a.driverCount !== b.driverCount) {
          return b.driverCount - a.driverCount
        }
        // Then sort by company name (ascending)
        return a.companyName.localeCompare(b.companyName)
      })
  })

  // Miscellaneous summary computed property
  const miscellaneousSummary = computed(() => {
    if (!filteredDriverData.value || filteredDriverData.value.length === 0) {
      return {
        duplicateDrivers: [],
        totalDuplicates: 0
      }
    }
    
    // Find duplicate drivers by license number
    const licenseNumberMap = new Map<string, any[]>()
    
    // Group drivers by combined province + license number (excluding empty/null license numbers)
    filteredDriverData.value.forEach(driver => {
      const licenseProvince = driver.licenseProvince?.trim()
      const licenseNumber = driver.licenseNumber?.trim()
      
      // Create combined license key (province + number)
      const combinedLicense = (licenseProvince && licenseNumber) 
        ? `${licenseProvince} ${licenseNumber}`
        : licenseNumber || licenseProvince
        
      if (combinedLicense && combinedLicense !== 'N/A') {
        if (!licenseNumberMap.has(combinedLicense)) {
          licenseNumberMap.set(combinedLicense, [])
        }
        licenseNumberMap.get(combinedLicense)!.push(driver)
      }
    })
    
    // Find license numbers that have more than one driver
    const duplicateDrivers = Array.from(licenseNumberMap.entries())
      .filter(([licenseNumber, drivers]) => drivers.length > 1)
      .map(([licenseNumber, drivers]) => ({
        licenseNumber,
        drivers,
        count: drivers.length
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending
    
    const totalDuplicates = duplicateDrivers.reduce((sum, group) => sum + group.count, 0)
    
    return {
      duplicateDrivers,
      totalDuplicates
    }
  })

  const filteredDeviceData = computed(() => {
    let filtered = consolidatedDeviceData.value

    if (!showAllDevices.value) {
      filtered = filtered.filter(device => {
        // Must have truck number and VIN
        const hasBasicInfo = device.truckNumber && device.vin
        
        // Must have license plate with state (not just "N/A" or state-only)
        const hasValidLicensePlate = device.licensePlates && 
          device.licensePlates.length > 0 && 
          device.licensePlates.some(plate => 
            plate !== 'N/A' && 
            plate.includes('(') && 
            plate.includes(')') &&
            !plate.startsWith('(') // Exclude state-only entries like "(CA)"
          )
        
        return hasBasicInfo && hasValidLicensePlate
      })
    }

    if (deviceSearchQuery.value.trim()) {
      const query = deviceSearchQuery.value.toLowerCase()
      filtered = filtered.filter(device =>
        (device.truckNumber || '').toLowerCase().includes(query) ||
        (device.vin || '').toLowerCase().includes(query) ||
        (device.licensePlate || '').toLowerCase().includes(query) ||
        (device.geotabId || '').toLowerCase().includes(query)
      )
    }

    return filtered
  })

  const deviceStateSummary = computed(() => {
    const stateCounts = new Map<string, number>()
    
    deviceData.value.forEach(device => {
      const state = device.licenseState || 'Unknown'
      stateCounts.set(state, (stateCounts.get(state) || 0) + 1)
    })
    
    return Array.from(stateCounts.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
  })

  // Helper function to extract license plate info from all possible field variations
  const extractPlateInfo = (device: any): string | null => {
    // Helper to check if a value is empty (null, undefined, empty string, or "N/A")
    const isEmpty = (value: any): boolean => {
      return !value || value.trim() === '' || value.trim().toLowerCase() === 'n/a'
    }
    
    // Check all possible license plate field combinations
    const plateFields = [
      { plate: device.licensePlate, state: device.licenseState },
      { plate: device.plate, state: device.plateState },
      { plate: device.licensePlate, state: device.plateState },
      { plate: device.plate, state: device.licenseState }
    ]
    
    // Find the first non-empty combination
    for (const field of plateFields) {
      if (!isEmpty(field.plate)) {
        const plateTrimmed = field.plate.trim()
        if (!isEmpty(field.state)) {
          const stateTrimmed = field.state.trim()
          return `${plateTrimmed} (${stateTrimmed})`
        } else {
          return plateTrimmed
        }
      }
    }
    
    // If no plate found, check for state-only (less useful but might exist)
    const stateFields = [device.licenseState, device.plateState]
    for (const state of stateFields) {
      if (!isEmpty(state)) {
        return `(${state.trim()})`
      }
    }
    
    return null
  }

  const consolidatedDeviceData = computed(() => {
    const deviceGroups = new Map<string, any[]>()
    const today = new Date()
    
    // First pass: Group all devices by primary key
    deviceData.value.forEach(device => {
      // Create a primary key - prefer truck number, fallback to license plate if available
      let primaryKey = device.truckNumber
      let groupType = 'truck'
      
      if (!primaryKey) {
        // Try to extract license plate info for grouping
        const plateInfo = extractPlateInfo(device)
        if (plateInfo) {
          primaryKey = plateInfo
          groupType = 'plate'
        }
      }
      
      if (!primaryKey) return // Skip entries without truck number or license plate
      
      // Parse activeTo date for this device entry
      let activeToDate = null
      if (device.activeTo) {
        try {
          activeToDate = new Date(device.activeTo)
        } catch (error) {
          console.warn(`Invalid activeTo date for device ${device.geotabId}:`, device.activeTo)
        }
      }
      
      // Add metadata to device
      const deviceWithMeta = {
        ...device,
        activeToDate,
        groupType,
        primaryKey,
        isActive: activeToDate ? activeToDate >= today : false
      }
      
      if (!deviceGroups.has(primaryKey)) {
        deviceGroups.set(primaryKey, [])
      }
      deviceGroups.get(primaryKey).push(deviceWithMeta)
    })
    
    // Second pass: Process each group to find active device and create consolidated entry
    const consolidatedResults: any[] = []
    
    deviceGroups.forEach((devices, primaryKey) => {
      // Sort devices by activeTo date (newest first), then by any other criteria
      const sortedDevices = devices.sort((a, b) => {
        // Active devices first
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
        
        // Then by activeTo date (newest first)
        if (a.activeToDate && b.activeToDate) {
          return b.activeToDate.getTime() - a.activeToDate.getTime()
        }
        if (a.activeToDate && !b.activeToDate) return -1
        if (!a.activeToDate && b.activeToDate) return 1
        
        // Finally by geotabId for consistency
        return (a.geotabId || '').localeCompare(b.geotabId || '')
      })
      
      // Determine if device is archived (no active entries)
      const hasActiveDevice = sortedDevices.some(d => d.isActive)
      const primaryDevice = sortedDevices[0] // Use the most recent/active device for primary data
      
      // Collect all unique data across all device entries
      const allGeotabIds = sortedDevices.map(d => d.geotabId).filter(Boolean)
      const allLicensePlates = new Set<string>()
      const allGroups = new Set<string>()
      
      sortedDevices.forEach(device => {
        // Collect license plates from all entries
        const plateInfo = extractPlateInfo(device)
        if (plateInfo) {
          allLicensePlates.add(plateInfo)
        }
        
        // Only collect groups from active device (or most recent if archived)
        if (device === primaryDevice && device.groups && Array.isArray(device.groups)) {
          device.groups.forEach(group => allGroups.add(group))
        }
      })
      
      // Create consolidated entry
      const plateDisplay = allLicensePlates.size > 0 
        ? Array.from(allLicensePlates).join(', ')
        : 'N/A'
      
      consolidatedResults.push({
        truckNumber: primaryDevice.truckNumber,
        geotabId: allGeotabIds.join(', '), // Comma-separated list of all IDs
        geotabIds: allGeotabIds, // Array of all IDs
        vin: primaryDevice.vin,
        licensePlate: plateDisplay,
        licenseState: primaryDevice.licenseState,
        licensePlates: Array.from(allLicensePlates), // Array of all unique plates
        groups: Array.from(allGroups), // Groups from active/primary device only
        jsonEntries: sortedDevices, // All device entries sorted by priority
        entryCount: allGeotabIds.length,
        groupType: primaryDevice.groupType,
        primaryKey: primaryKey,
        isArchived: !hasActiveDevice, // Flag if no active devices
        activeDevice: primaryDevice, // Reference to the active/primary device
        activeTo: primaryDevice.activeTo, // activeTo date from primary device
        activeToDate: primaryDevice.activeToDate // Parsed activeTo date
      })
    })
    
    return consolidatedResults.sort((a, b) => {
      // Archived devices last
      if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1
      
      // Sort by entry count first (most duplicates first), then by group type (trucks first)
      if (a.entryCount !== b.entryCount) return b.entryCount - a.entryCount
      if (a.groupType !== b.groupType) return a.groupType === 'truck' ? -1 : 1
      return 0
    })
  })

  const deviceDuplicateSummary = computed(() => {
    const multipleEntries = consolidatedDeviceData.value.filter(item => item.entryCount > 1)
    const truckDuplicates = multipleEntries.filter(item => item.groupType === 'truck')
    const plateDuplicates = multipleEntries.filter(item => item.groupType === 'plate')
    
    return {
      duplicateItems: multipleEntries,
      duplicateTruckNumbers: truckDuplicates,
      duplicateLicensePlates: plateDuplicates,
      totalDuplicateEntries: multipleEntries.reduce((sum, item) => sum + item.entryCount, 0),
      uniqueItemCount: consolidatedDeviceData.value.length,
      totalDeviceEntries: deviceData.value.length,
      truckCount: consolidatedDeviceData.value.filter(item => item.groupType === 'truck').length,
      plateOnlyCount: consolidatedDeviceData.value.filter(item => item.groupType === 'plate').length
    }
  })

  // Methods
  const loadPollingStatus = async () => {
    try {
      const geotabService = (feathersClient.service('geotab') as any)
      
      if (typeof geotabService.getPollingStatus === 'function') {
        const status = await geotabService.getPollingStatus()
        pollingStatus.value = status
        updateCountdown()
        console.log('Polling status:', status.isPolling ? `Active, next snapshot: ${status.nextSnapshot}` : 'Inactive')
      } else {
        console.warn('getPollingStatus method not available - backend may need restart')
        pollingStatus.value = { isPolling: false, intervalMinutes: 10 }
      }
    } catch (error) {
      console.error('Error loading polling status:', error)
      pollingStatus.value = { isPolling: false, intervalMinutes: 10 }
    }
  }

  const updateCountdown = () => {
    if (!pollingStatus.value.isPolling || !pollingStatus.value.nextSnapshot) {
      nextSnapshotCountdown.value = ''
      return
    }

    const now = new Date()
    const nextSnapshot = new Date(pollingStatus.value.nextSnapshot)
    const timeDiff = nextSnapshot.getTime() - now.getTime()

    if (timeDiff <= 0) {
      nextSnapshotCountdown.value = 'Due now'
      // Refresh polling status if snapshot is overdue
      setTimeout(() => {
        loadPollingStatus()
        loadAvailableSnapshots()
      }, 1000)
      return
    }

    const minutes = Math.floor(timeDiff / (1000 * 60))
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
    nextSnapshotCountdown.value = `${minutes}m ${seconds}s`
  }

  const loadAvailableSnapshots = async () => {
    loadingSnapshots.value = true
    try {
      const fleetStatusService = (feathersClient.service('fleet-status') as any)
      console.log('FleetStatus service:', fleetStatusService)
      console.log('getAvailableSnapshots method available:', typeof fleetStatusService.getAvailableSnapshots === 'function')
      
      if (typeof fleetStatusService.getAvailableSnapshots === 'function') {
        console.log('Calling getAvailableSnapshots...')
        const snapshots = await fleetStatusService.getAvailableSnapshots()
        console.log('Raw snapshots response:', snapshots)
        availableSnapshots.value = snapshots
        console.log(`Loaded ${snapshots.length} available snapshots`)
        console.log('Available snapshots array:', availableSnapshots.value)
      } else {
        console.warn('FleetStatus service getAvailableSnapshots method not available yet')
        availableSnapshots.value = []
      }
    } catch (error) {
      console.error('Error loading available snapshots:', error)
      console.error('Error details:', error)
      availableSnapshots.value = []
    } finally {
      loadingSnapshots.value = false
    }
  }

  const selectSnapshot = async (recordedAt: string) => {
    loadingRealTime.value = true
    realTimeError.value = ''

    try {
      const fleetStatusService = (feathersClient.service('fleet-status') as any)
      if (typeof fleetStatusService.getFleetStatusBySnapshot === 'function') {
        const snapshotData = await fleetStatusService.getFleetStatusBySnapshot(recordedAt)
        
        // Convert snapshot data to table format
        const tableData: any[] = []
        snapshotData.forEach((item: any) => {
          tableData.push({
            truckID: String(item.deviceName || item.deviceId || 'Unknown'),
            type: 'Historical Data',
            status: item.isDriving ? 'Driving' : 'Stopped',
            location: item.latitude && item.longitude 
              ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
              : 'N/A',
            speed: item.speed !== undefined ? `${Math.round(item.speed * 0.621371)} mph` : 'N/A',
            bearing: item.bearing !== undefined ? `${Math.round(item.bearing)}°` : 'N/A',
            driver: item.driverId || 'N/A',
            driverInfo: item.driverInfo || null,
            isDriving: Boolean(item.isDriving),
            error: null,
            responseTimestamp: item.responseTimestamp,
            recordedAt: item.recordedAt
          })
        })
        
        realTimeData.value = tableData
        lastUpdateTime.value = recordedAt
        console.log(`Loaded snapshot from ${recordedAt} with ${tableData.length} vehicles`)
      } else {
        throw new Error('FleetStatus service not available')
      }
    } catch (error) {
      console.error('Error loading snapshot data:', error)
      realTimeError.value = error instanceof Error ? error.message : 'Failed to load snapshot'
      realTimeData.value = []
    } finally {
      loadingRealTime.value = false
    }
  }

  const loadGEOtabStatus = async () => {
    try {
      // Check if new backend methods are available
      const geotabService = feathersClient.service('geotab') as any
      if (typeof geotabService.getMemoryAuthStatus !== 'function') {
        console.warn('New backend methods not available yet, falling back to localStorage only')
        // Fallback to localStorage only
        const stored = JSON.parse(localStorage.getItem('geotabStatus') || '{}')
        geotabStatus.value = stored.isAuthenticated ? stored : {
          isAuthenticated: false,
          database: '',
          username: '',
          password: '',
          lastAuthenticated: null
        }
        return
      }

      // Check backend memory auth status first
      const memoryStatus = await geotabService.getMemoryAuthStatus()
      
      if (memoryStatus.isAuthenticated) {
        geotabStatus.value = {
          isAuthenticated: true,
          database: memoryStatus.database,
          username: memoryStatus.username,
          password: memoryStatus.password || '', // Use password from backend if available
          lastAuthenticated: new Date().toISOString()
        }
        console.log('Loaded auth from backend memory:', memoryStatus)
      } else {
        // Check if frontend has credentials in localStorage (from AppHeader auth)
        const stored = JSON.parse(localStorage.getItem('geotabStatus') || '{}')
        if (stored.isAuthenticated && stored.password) {
          console.log('Frontend has credentials in localStorage, syncing to backend...')
          try {
            // Sync frontend credentials to backend memory
            const authResponse = await geotabService.authenticate({
              database: stored.database,
              username: stored.username,
              password: stored.password
            })
            
            if (authResponse.success) {
              geotabStatus.value = {
                isAuthenticated: true,
                database: stored.database,
                username: stored.username,
                password: stored.password,
                lastAuthenticated: new Date().toISOString()
              }
              console.log('Successfully synced frontend credentials to backend memory')
            } else {
              throw new Error(authResponse.error || 'Authentication failed')
            }
          } catch (syncError) {
            console.error('Error syncing to backend:', syncError)
            geotabStatus.value = {
              isAuthenticated: false,
              database: '',
              username: '',
              password: '',
              lastAuthenticated: null
            }
          }
        } else {
          // No authentication available anywhere
          geotabStatus.value = {
            isAuthenticated: false,
            database: '',
            username: '',
            password: '',
            lastAuthenticated: null
          }
        }
      }
    } catch (error) {
      console.error('Error loading GEOtab status:', error)
      geotabStatus.value = {
        isAuthenticated: false,
        database: '',
        username: '',
        password: '',
        lastAuthenticated: null
      }
    }
  }

  const refreshRealTimeData = async (forceRefresh = false) => {
    console.log(`refreshRealTimeData called with forceRefresh: ${forceRefresh}`)
    loadingRealTime.value = true
    realTimeError.value = ''
    
    try {
      const geotabService = feathersClient.service('geotab') as any
      
      // For non-forced refreshes, use the smart method that doesn't make API calls
      if (!forceRefresh) {
        console.log('Non-forced refresh - checking for smart method...')
        console.log('getFleetDataSmart available:', typeof geotabService.getFleetDataSmart === 'function')
        
        if (typeof geotabService.getFleetDataSmart === 'function') {
          console.log('Using smart fleet data retrieval (no API calls)...')
          const smartResponse = await geotabService.getFleetDataSmart()
          console.log('Smart response:', smartResponse)
          
          if (smartResponse.success && smartResponse.data && smartResponse.data.length > 0) {
            console.log(`Smart method returned ${smartResponse.data.length} records from ${smartResponse.source}`)
            
            // Process the data
            const tableData: any[] = []
            smartResponse.data.forEach((item: any) => {
              tableData.push({
                truckID: String(item.deviceName || item.deviceId || 'Unknown'),
                type: smartResponse.source || 'Unknown Source',
                status: item.isDriving ? 'Driving' : 'Stopped',
                location: item.latitude && item.longitude 
                  ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                  : 'N/A',
                speed: item.speed !== undefined ? `${Math.round(item.speed * 0.621371)} mph` : 'N/A',
                bearing: item.bearing !== undefined ? `${Math.round(item.bearing)}°` : 'N/A',
                driver: item.driverId || 'N/A',
                driverInfo: item.driverInfo || null,
                isDriving: Boolean(item.isDriving),
                error: null,
                responseTimestamp: item.responseTimestamp
              })
            })
            
            realTimeData.value = tableData
            lastUpdateTime.value = smartResponse.timestamp ? new Date(smartResponse.timestamp).toISOString() : new Date().toISOString()
            console.log(`Loaded ${tableData.length} fleet records from ${smartResponse.source}`)
            return
          } else {
            console.log('Smart method found no data:', smartResponse.error)
            realTimeData.value = []
            realTimeError.value = smartResponse.error || 'No fleet data available. Use "Force Fresh Data" button in the Real-time Fleet Tracking section to load initial data.'
            return
          }
        } else {
          console.log('Smart method not available - frontend client may need updating')
          realTimeData.value = []
          realTimeError.value = 'Frontend client needs updating. Please refresh the page or use "Force Fresh Data" button in the Real-time Fleet Tracking section.'
          return
        }
      }

      // Only make API call if explicitly forcing refresh
      console.log('Forcing fresh API call to GEOtab...')

      // Mirror the authentication approach from loadTripData
      // Get authentication data from localStorage
      const stored = JSON.parse(localStorage.getItem('geotabStatus') || '{}')
      console.log('Stored geotab status:', stored)
      
      if (!stored.database || !stored.username || !stored.isAuthenticated) {
        if (typeof window !== 'undefined' && (window as any).openGEOtabDialog) {
          (window as any).openGEOtabDialog()
        }
        throw new Error('Please authenticate with GEOtab first.')
      }
      
      // Also get the backend memory auth status (like loadTripData does)
      const authStatus = await geotabService.getMemoryAuthStatus()
      console.log('Backend auth status:', authStatus)
      
      if (!authStatus.isAuthenticated) {
        if (typeof window !== 'undefined' && (window as any).openGEOtabDialog) {
          (window as any).openGEOtabDialog()
        }
        throw new Error('GEOtab session expired. Please re-authenticate.')
      }

      console.log('Using GEOtab auth:', { database: stored.database, username: stored.username })

      // Call the service - getRealTimeFleetInfo takes authData directly as first parameter
      const response = await geotabService.getRealTimeFleetInfo({
        database: authStatus.database,
        username: authStatus.username,
        password: 'from_memory' // Backend will use stored credentials
      })
      
      console.log('Real-time fleet response:', JSON.stringify(response, null, 2))

      if (response.success) {
        console.log(`Received ${response.deviceData?.length || 0} Device records`)
        console.log(`Received ${response.deviceStatusData?.length || 0} DeviceStatusInfo records`)
        console.log(`Received ${response.userData?.length || 0} User records`)
        console.log(`Received ${response.combinedData?.length || 0} Combined records`)
        
        // Use the backend's combinedData instead of processing raw arrays
        const tableData: any[] = []
        
        if (response.combinedData && response.combinedData.length > 0) {
          response.combinedData.forEach((item: any) => {
            tableData.push({
              truckID: String(item.deviceName || item.deviceId || 'Unknown'),
              type: 'Real-time Data',
              status: item.isDriving ? 'Driving' : 'Stopped',
              location: item.latitude && item.longitude 
                ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                : 'N/A',
              speed: item.speed !== undefined ? `${Math.round(item.speed * 0.621371)} mph` : 'N/A',
              bearing: item.bearing !== undefined ? `${Math.round(item.bearing)}°` : 'N/A',
              driver: item.driverId || 'N/A',
              driverInfo: item.driverInfo || null,
              isDriving: Boolean(item.isDriving),
              error: null,
              responseTimestamp: item.responseTimestamp
            })
          })
        }
        
        realTimeData.value = tableData
        lastUpdateTime.value = new Date().toISOString()
        console.log(`Loaded ${tableData.length} fresh fleet tracking records`)
        
        if (tableData.length === 0) {
          console.warn('No combined data returned from backend')
        }
      } else {
        console.error('Backend returned failure:', response.error)
        
        // Check for throttle errors and show user-friendly message
        if (response.error && response.error.includes('GEOTAB_THROTTLED')) {
          throw new Error('GEOtab API is temporarily unavailable due to rate limiting. Please wait 1 minute before trying again.')
        }
        
        throw new Error(response.error || 'Backend reported failure')
      }
    } catch (error) {
      console.error('Error fetching real-time fleet data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      // Show special handling for throttle errors
      if (errorMessage.includes('rate limit') || errorMessage.includes('GEOTAB_THROTTLED')) {
        realTimeError.value = '⚠️ GEOtab API temporarily unavailable (rate limited). Please wait 1 minute and try again.'
      } else {
        realTimeError.value = errorMessage
      }
      
      realTimeData.value = []
    } finally {
      loadingRealTime.value = false
    }
  }

  // Refresh from latest snapshot in database
  const refreshFromLatestSnapshot = async () => {
    loadingRealTime.value = true
    realTimeError.value = ''
    
    try {
      console.log('Refreshing from latest snapshot in database...')
      
      // First try to get latest snapshot from database
      const fleetStatusService = feathersClient.service('fleet-status') as any
      if (typeof fleetStatusService.getLatestFleetStatus === 'function') {
        const latestSnapshot = await fleetStatusService.getLatestFleetStatus()
        
        if (latestSnapshot && latestSnapshot.length > 0) {
          console.log(`Found latest snapshot with ${latestSnapshot.length} records`)
          
          // Process snapshot data
          const tableData: any[] = []
          latestSnapshot.forEach((item: any) => {
            tableData.push({
              truckID: String(item.deviceName || item.deviceId || 'Unknown'),
              type: 'Snapshot',
              status: item.isDriving ? 'Driving' : 'Stopped',
              location: item.latitude && item.longitude 
                ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                : 'N/A',
              speed: item.speed !== undefined ? `${Math.round(item.speed * 0.621371)} mph` : 'N/A',
              bearing: item.bearing !== undefined ? `${Math.round(item.bearing)}°` : 'N/A',
              driver: item.driverId || 'N/A',
              driverInfo: item.driverInfo || null,
              isDriving: Boolean(item.isDriving),
              error: null,
              responseTimestamp: item.responseTimestamp
            })
          })
          
          realTimeData.value = tableData
          lastUpdateTime.value = latestSnapshot[0].recordedAt || new Date().toISOString()
          console.log(`Loaded ${tableData.length} records from latest snapshot`)
          return
        }
      }
      
      // If no snapshot available, fall back to cached data
      console.log('No database snapshot found, trying cached data...')
      await refreshRealTimeData(false) // Don't force refresh, use cache if available
      
    } catch (error) {
      console.error('Error refreshing from snapshot:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load snapshot data'
      realTimeError.value = errorMessage
      realTimeData.value = []
    } finally {
      loadingRealTime.value = false
    }
  }

  // Update database groups function
  const updateDatabaseGroups = async () => {
    updatingDatabase.value = true
    
    try {
      console.log('Updating database with group information...')
      
      const geotabService = feathersClient.service('geotab') as any
      if (typeof geotabService.updateDatabaseGroups === 'function') {
        const result = await geotabService.updateDatabaseGroups({})
        
        if (result.success) {
          console.log(`Database update complete: ${result.driversUpdated} drivers, ${result.devicesUpdated} devices updated`)
          
          // Show success notification
          const message = `Successfully updated database: ${result.driversUpdated || 0} drivers and ${result.devicesUpdated || 0} devices updated with group information.`
          alert(message)
        } else {
          throw new Error(result.error || 'Update failed')
        }
      } else {
        throw new Error('Update database function not available')
      }
      
    } catch (error) {
      console.error('Error updating database groups:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update database'
      alert(`Database update failed: ${errorMessage}`)
    } finally {
      updatingDatabase.value = false
    }
  }

  // Watch for GEOtab status changes
  const handleGEOtabStatusChange = async () => {
    await loadGEOtabStatus()
    
    // If authenticated, trigger immediate poll and reload status
    if (geotabStatus.value.isAuthenticated) {
      console.log('GEOtab authenticated - triggering immediate poll and reloading status')
      
      try {
        const geotabService = feathersClient.service('geotab') as any
        if (typeof geotabService.triggerImmediatePoll === 'function') {
          const result = await geotabService.triggerImmediatePoll()
          console.log('Immediate poll result:', result)
        }
      } catch (error) {
        console.error('Error triggering immediate poll:', error)
      }
      
      // Reload polling status and snapshots after a brief delay
      setTimeout(() => {
        loadPollingStatus()
        loadAvailableSnapshots()
      }, 2000)
    }
  }

  // Handle snapshot selection from dropdown
  const onSnapshotSelected = async (value: string) => {
    if (value === 'latest') {
      // Load latest data using smart method
      await refreshRealTimeData(false)
    } else {
      // Load specific snapshot
      await selectSnapshot(value)
    }
  }

  // Open history dialog for driver or vehicle
  const openHistoryDialog = async (item: any, type: 'driver' | 'vehicle') => {
    historyDialog.value = true
    historyLoading.value = true
    historyData.value = []
    
    if (type === 'driver' && item.driverInfo) {
      historyTarget.value = {
        type: 'driver',
        name: `${item.driverInfo.firstName || ''} ${item.driverInfo.lastName || ''}`.trim(),
        id: item.driverInfo.id
      }
    } else if (type === 'vehicle') {
      historyTarget.value = {
        type: 'vehicle',
        name: item.truckID,
        id: item.deviceId
      }
    }

    try {
      // Get all available snapshots
      const fleetStatusService = feathersClient.service('fleet-status') as any
      if (typeof fleetStatusService.getAvailableSnapshots !== 'function') {
        throw new Error('Fleet status service not available')
      }

      const snapshots = await fleetStatusService.getAvailableSnapshots()
      console.log(`Searching through ${snapshots.length} snapshots for ${type}: ${historyTarget.value.name}`)

      const allHistoryRecords: any[] = []

      // Search through each snapshot
      for (const snapshot of snapshots) {
        try {
          const snapshotData = await fleetStatusService.getFleetStatusBySnapshot(snapshot.recordedAt)
          
          // Filter for matching driver or vehicle
          const matchingRecords = snapshotData.filter((record: any) => {
            if (type === 'driver' && historyTarget.value.id) {
              return record.driverId === historyTarget.value.id
            } else if (type === 'vehicle') {
              return record.deviceName === historyTarget.value.name || record.deviceId === historyTarget.value.id
            }
            return false
          })

          // Add snapshot timestamp to each record
          matchingRecords.forEach((record: any) => {
            allHistoryRecords.push({
              ...record,
              snapshotTime: snapshot.recordedAt
            })
          })
        } catch (error) {
          console.warn(`Error loading snapshot ${snapshot.recordedAt}:`, error)
        }
      }

      // Process and format the history data
      const formattedHistory = allHistoryRecords.map((record) => {
        const baseData = {
          dateTime: new Date(record.snapshotTime).toLocaleString(),
          location: record.latitude && record.longitude 
            ? `${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}`
            : 'N/A',
          speed: record.speed !== undefined ? `${Math.round(record.speed * 0.621371)} mph` : 'N/A',
          bearing: record.bearing !== undefined ? `${Math.round(record.bearing)}°` : 'N/A',
          isDriving: Boolean(record.isDriving),
          rawDateTime: new Date(record.snapshotTime)
        }
        
        // Add driver or vehicle info based on history type
        if (type === 'vehicle') {
          // For vehicle history, show the driver
          (baseData as any).driver = record.driverInfo 
            ? `${record.driverInfo.firstName || ''} ${record.driverInfo.lastName || ''}`.trim()
            : (record.driverId ? `ID: ${record.driverId}` : 'No driver')
        } else if (type === 'driver') {
          // For driver history, show the vehicle
          (baseData as any).vehicle = record.deviceName || record.deviceId || 'Unknown Vehicle'
        }
        
        return baseData
      })

      // Sort by date (newest first)
      historyData.value = formattedHistory.sort((a, b) => b.rawDateTime.getTime() - a.rawDateTime.getTime())
      
      console.log(`Found ${historyData.value.length} historical records for ${type}: ${historyTarget.value.name}`)
    } catch (error) {
      console.error('Error loading history:', error)
      historyData.value = []
    } finally {
      historyLoading.value = false
    }
  }

  // Helper function to calculate distance between two points in miles using Haversine formula
  const calculateDistanceMiles = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Load stops data (route-stops + terminals) for closest stop lookup
  const loadStopsData = async (): Promise<any[]> => {
    try {
      if (stopsData.value.length > 0) {
        return stopsData.value // Return cached data
      }

      console.log('[TRIP] Loading stops and terminals data for closest stop lookup...')
      
      // Load route-stops
      const routeStopsService = feathersClient.service('route-stops')
      const routeStopsResponse = await routeStopsService.find({
        query: {
          $limit: 10000, // Get all stops (large limit)
          latitude: { $ne: null }, // Only stops with valid coordinates
          longitude: { $ne: null }
        },
        paginate: false // Disable pagination to get all records
      })

      const routeStops = Array.isArray(routeStopsResponse) ? routeStopsResponse : routeStopsResponse.data || []
      const validRouteStops = routeStops.filter(stop => 
        stop.latitude != null && 
        stop.longitude != null && 
        stop.custName && 
        stop.custName.trim() !== ''
      )

      // Load terminals
      const terminalsService = feathersClient.service('terminals')
      const terminalsResponse = await terminalsService.find({
        query: {
          $limit: 10000, // Get all terminals
          latitude: { $ne: null }, // Only terminals with valid coordinates
          longitude: { $ne: null }
        },
        paginate: false // Disable pagination to get all records
      })

      const terminals = Array.isArray(terminalsResponse) ? terminalsResponse : terminalsResponse.data || []
      const validTerminals = terminals.filter(terminal => 
        terminal.latitude != null && 
        terminal.longitude != null && 
        terminal.name && 
        terminal.name.trim() !== ''
      ).map(terminal => ({
        ...terminal,
        custName: terminal.name, // Map terminal name to custName for consistency
        address: terminal.streetAddress || `${terminal.city}, ${terminal.state}` || 'Terminal Location',
        isTerminal: true // Flag to identify terminals
      }))

      // Combine route-stops and terminals
      stopsData.value = [...validRouteStops, ...validTerminals]
      
      console.log(`[TRIP] Loaded ${validRouteStops.length} route stops and ${validTerminals.length} terminals (${stopsData.value.length} total) for lookup`)
      return stopsData.value
    } catch (error) {
      console.error('[TRIP] Error loading stops and terminals data:', error)
      return []
    }
  }

  // Find closest stop to given coordinates
  const findClosestStop = (tripLat: number, tripLon: number, stops: any[]): { stop: any, distance: number } | null => {
    if (!stops || stops.length === 0 || !tripLat || !tripLon) {
      return null
    }

    let closestStop = null
    let minDistance = Infinity

    for (const stop of stops) {
      if (!stop.latitude || !stop.longitude) continue
      
      const distance = calculateDistanceMiles(tripLat, tripLon, stop.latitude, stop.longitude)
      if (distance < minDistance) {
        minDistance = distance
        closestStop = stop
      }
    }

    return closestStop ? { stop: closestStop, distance: minDistance } : null
  }

  // Trip data methods
  const loadTripData = async () => {
    if (!selectedTripDate.value) {
      tripError.value = 'Please select a date'
      return
    }

    loadingTripData.value = true
    tripError.value = ''

    try {
      // Get authentication data from localStorage
      const stored = JSON.parse(localStorage.getItem('geotabStatus') || '{}')
      console.log('Stored geotab status:', stored)
      
      if (!stored.database || !stored.username || !stored.isAuthenticated) {
        tripError.value = 'Please authenticate with GEOtab first'
        return
      }
      
      // Also get the password from the geotab service memory
      const geotabService = feathersClient.service('geotab')
      const authStatus = await geotabService.getMemoryAuthStatus()
      console.log('Backend auth status:', authStatus)
      
      if (!authStatus.isAuthenticated) {
        tripError.value = 'GEOtab session expired. Please re-authenticate.'
        return
      }

      // Convert date to ISO string with start of day
      const fromDate = new Date(selectedTripDate.value + 'T00:00:00.000Z').toISOString()
      
      console.log('Loading trip data for date:', fromDate)
      console.log('Using GEOtab auth:', { database: stored.database, username: stored.username })
      
      // Use the geotab service for trip data (after refactor)
      const response = await feathersClient.service('geotab').getTripData({
        fromDate: fromDate,
        authData: {
          database: authStatus.database,
          username: authStatus.username,
          password: 'from_memory' // Backend will use stored credentials
        }
      })

      tripData.value = response.trips || []
      tripDataFromCache.value = response.fromCache || false
      
      console.log(`Loaded ${tripData.value.length} trip records`, response.fromCache ? '(from cache)' : '(from API)')
      
      // Enhance trip data with closest stop information if we have trips
      if (tripData.value.length > 0) {
        console.log('[TRIP] Enhancing trip data with closest stop information...')
        const stops = await loadStopsData()
        
        if (stops.length > 0) {
          tripData.value = tripData.value.map(trip => {
            const enhancedTrip = { ...trip }
            
            // Add combined lat/long field
            const lat = trip.stopPoint?.y
            const lng = trip.stopPoint?.x
            if (lat && lng && typeof lat === 'number' && typeof lng === 'number') {
              enhancedTrip.latLong = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            } else {
              enhancedTrip.latLong = 'N/A'
            }

            // Find closest stop if coordinates are available
            if (trip.stopPoint?.x && trip.stopPoint?.y && typeof trip.stopPoint.x === 'number' && typeof trip.stopPoint.y === 'number') {
              const closestStopResult = findClosestStop(trip.stopPoint.y, trip.stopPoint.x, stops)
              if (closestStopResult) {
                // If distance is greater than 0.2 miles, show "Unknown Location"
                if (closestStopResult.distance > 0.2) {
                  enhancedTrip.closestStop = 'Unknown Location'
                  enhancedTrip.closestStopAddress = 'N/A'
                } else {
                  enhancedTrip.closestStop = closestStopResult.stop.custName || 'Unknown Stop'
                  enhancedTrip.closestStopAddress = closestStopResult.stop.address || 'No address'
                }
                enhancedTrip.stopDistance = `${closestStopResult.distance.toFixed(2)} miles`
              } else {
                enhancedTrip.closestStop = 'No stop found'
                enhancedTrip.stopDistance = 'N/A'
                enhancedTrip.closestStopAddress = 'N/A'
              }
            } else {
              enhancedTrip.closestStop = 'No coordinates'
              enhancedTrip.stopDistance = 'N/A'
              enhancedTrip.closestStopAddress = 'N/A'
            }
            
            return enhancedTrip
          })
          
          console.log(`[TRIP] Enhanced ${tripData.value.length} trips with closest stop information`)
        } else {
          console.log('[TRIP] No stops data available for enhancement')
        }
      }
    } catch (error: any) {
      console.error('Error loading trip data:', error)
      tripError.value = error.message || 'Failed to load trip data'
      tripData.value = []
      tripDataFromCache.value = false
    } finally {
      loadingTripData.value = false
    }
  }

  const clearTripData = async () => {
    try {
      await feathersClient.service('geotab').clearTripCache()
      tripData.value = []
      tripDataFromCache.value = false
      console.log('Trip cache cleared')
    } catch (error: any) {
      console.error('Error clearing trip cache:', error)
    }
  }

  // Driver data methods
  const loadGroupData = async () => {
    loadingGroupData.value = true
    groupError.value = ''
    try {
      // Get authentication data from localStorage
      const stored = JSON.parse(localStorage.getItem('geotabStatus') || '{}')
      console.log('Stored geotab status:', stored)
      
      if (!stored.database || !stored.username || !stored.isAuthenticated) {
        groupError.value = 'Please authenticate with GEOtab first'
        return
      }
      
      // Also get the password from the geotab service memory
      const geotabService = feathersClient.service('geotab')
      const authStatus = await geotabService.getMemoryAuthStatus()
      
      if (!authStatus.isAuthenticated) {
        groupError.value = 'GEOtab authentication expired. Please re-authenticate.'
        return
      }
      
      console.log('Loading group data from Geotab...')
      console.log('Using GEOtab auth:', { database: stored.database, username: stored.username })
      
      // Use the geotab service for group data
      const response = await feathersClient.service('geotab').getGroupData({
        authData: {
          database: authStatus.database,
          username: authStatus.username,
          password: 'from_memory' // Backend will use stored credentials
        }
      })
      
      groupData.value = response.groups || []
      groupDataFromCache.value = response.fromCache || false
      console.log(`Loaded ${groupData.value.length} groups from ${response.fromCache ? 'cache' : 'Geotab API'}`)
      
    } catch (error: any) {
      console.error('Error loading group data:', error)
      groupError.value = error.message || 'Failed to load group data'
      groupData.value = []
    } finally {
      loadingGroupData.value = false
    }
  }

  const clearGroupData = async () => {
    try {
      await feathersClient.service('geotab').clearGroupCache()
      groupData.value = []
      groupDataFromCache.value = false
      console.log('Group cache cleared')
    } catch (error: any) {
      console.error('Error clearing group cache:', error)
    }
  }

  const loadDriverData = async () => {
    loadingDriverData.value = true
    driverError.value = ''

    try {
      // Get authentication data from localStorage
      const stored = JSON.parse(localStorage.getItem('geotabStatus') || '{}')
      console.log('Stored geotab status:', stored)
      
      if (!stored.database || !stored.username || !stored.isAuthenticated) {
        driverError.value = 'Please authenticate with GEOtab first'
        return
      }
      
      // Also get the password from the geotab service memory
      const geotabService = feathersClient.service('geotab')
      const authStatus = await geotabService.getMemoryAuthStatus()
      console.log('Backend auth status:', authStatus)
      
      if (!authStatus.isAuthenticated) {
        driverError.value = 'GEOtab session expired. Please re-authenticate.'
        return
      }

      console.log('Loading driver data from Geotab...')
      console.log('Using GEOtab auth:', { database: stored.database, username: stored.username })
      
      // Use the geotab service for driver data
      const response = await feathersClient.service('geotab').getDriverData({
        authData: {
          database: authStatus.database,
          username: authStatus.username,
          password: 'from_memory' // Backend will use stored credentials
        }
      })

      const drivers = response.drivers || []
      driverDataFromCache.value = response.fromCache || false
      
      console.log(`Loaded ${drivers.length} driver records`, response.fromCache ? '(from cache)' : '(from API)')
      
      // Driver data is already processed by backend with correct field mappings
      driverData.value = drivers
      
    } catch (error: any) {
      console.error('Error loading driver data:', error)
      driverError.value = error.message || 'Failed to load driver data'
      driverData.value = []
      driverDataFromCache.value = false
    } finally {
      loadingDriverData.value = false
    }
  }

  const clearDriverData = async () => {
    try {
      await feathersClient.service('geotab').clearDriverCache()
      driverData.value = []
      driverDataFromCache.value = false
      console.log('Driver cache cleared')
    } catch (error: any) {
      console.error('Error clearing driver cache:', error)
    }
  }

  // Function to open driver inspection dialog
  const openDriverInspectionDialog = (driverData: any) => {
    selectedDriverData.value = driverData
    driverInspectionDialog.value = true
  }

  // Function to copy driver data to clipboard
  const copyDriverDataToClipboard = async () => {
    if (selectedDriverData.value) {
      try {
        const driverDataText = JSON.stringify(selectedDriverData.value, null, 2)
        
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(driverDataText)
          console.log('Driver data copied to clipboard')
        } else {
          // Fallback to older execCommand method
          const textArea = document.createElement('textarea')
          textArea.value = driverDataText
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          
          try {
            const successful = document.execCommand('copy')
            if (successful) {
              console.log('Driver data copied to clipboard (fallback method)')
            } else {
              console.error('Failed to copy using execCommand')
            }
          } finally {
            document.body.removeChild(textArea)
          }
        }
      } catch (error) {
        console.error('Failed to copy driver data to clipboard:', error)
      }
    }
  }

  const loadDeviceData = async () => {
    loadingDeviceData.value = true
    deviceError.value = ''
    try {
      // Get authentication data from localStorage
      const stored = JSON.parse(localStorage.getItem('geotabStatus') || '{}')
      console.log('Stored geotab status:', stored)
      
      if (!stored.database || !stored.username || !stored.isAuthenticated) {
        deviceError.value = 'Please authenticate with GEOtab first'
        return
      }
      
      // Also get the password from the geotab service memory
      const geotabService = feathersClient.service('geotab')
      const authStatus = await geotabService.getMemoryAuthStatus()
      
      if (!authStatus.isAuthenticated) {
        deviceError.value = 'GEOtab authentication expired. Please re-authenticate.'
        return
      }
      
      console.log('Loading device data from Geotab...')
      console.log('Using GEOtab auth:', { database: stored.database, username: stored.username })
      
      // Use the geotab service for device data
      const response = await feathersClient.service('geotab').getDeviceData({
        authData: {
          database: authStatus.database,
          username: authStatus.username,
          password: 'from_memory' // Backend will use stored credentials
        }
      })
      
      deviceData.value = response.devices || []
      deviceDataFromCache.value = response.fromCache || false
      console.log(`Loaded ${deviceData.value.length} devices from ${response.fromCache ? 'cache' : 'Geotab API'}`)
      
    } catch (error: any) {
      console.error('Error loading device data:', error)
      deviceError.value = error.message || 'Failed to load device data'
      deviceData.value = []
    } finally {
      loadingDeviceData.value = false
    }
  }

  const clearDeviceData = async () => {
    try {
      await feathersClient.service('geotab').clearDeviceCache()
      deviceData.value = []
      deviceDataFromCache.value = false
      console.log('Device cache cleared')
    } catch (error: any) {
      console.error('Error clearing device cache:', error)
    }
  }

  const openDeviceInspectionDialog = (device: any) => {
    selectedDeviceData.value = device
    deviceInspectionDialog.value = true
  }

  const copyDeviceDataToClipboard = async () => {
    if (selectedDeviceData.value) {
      try {
        const deviceDataText = JSON.stringify(selectedDeviceData.value, null, 2)
        
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(deviceDataText)
          console.log('Device data copied to clipboard')
        } else {
          // Fallback to older execCommand method
          const textArea = document.createElement('textarea')
          textArea.value = deviceDataText
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          
          try {
            const successful = document.execCommand('copy')
            if (successful) {
              console.log('Device data copied to clipboard (fallback method)')
            } else {
              console.error('Failed to copy using execCommand')
            }
          } finally {
            document.body.removeChild(textArea)
          }
        }
      } catch (error) {
        console.error('Failed to copy device data to clipboard:', error)
      }
    }
  }

  const copyCompanyNamesToClipboard = async () => {
    try {
      const companyNames = companySummary.value.map(company => company.companyName).join('\n')
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(companyNames)
        console.log(`Copied ${companySummary.value.length} company names to clipboard`)
      } else {
        // Fallback to older execCommand method
        const textArea = document.createElement('textarea')
        textArea.value = companyNames
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          const successful = document.execCommand('copy')
          if (successful) {
            console.log(`Copied ${companySummary.value.length} company names to clipboard (fallback method)`)
          } else {
            console.error('Failed to copy using execCommand')
          }
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (error) {
      console.error('Failed to copy company names to clipboard:', error)
      
      // Last resort: show the data in a prompt for manual copying
      const companyNames = companySummary.value.map(company => company.companyName).join('\n')
      window.prompt('Copy the company names below (Ctrl+C/Cmd+C):', companyNames)
    }
  }

  // Function to copy group names to clipboard
  const copyGroupNamesToClipboard = async () => {
    try {
      const groupNames = groupData.value.map(group => group.name).join('\n')
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(groupNames)
        console.log(`Copied ${groupData.value.length} group names to clipboard`)
        return
      }
      
      // Fallback for older browsers
      if (document.execCommand) {
        const textArea = document.createElement('textarea')
        textArea.value = groupNames
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        if (document.execCommand('copy')) {
          console.log(`Copied ${groupData.value.length} group names to clipboard (fallback method)`)
        } else {
          throw new Error('execCommand failed')
        }
        
        document.body.removeChild(textArea)
        return
      }
      
      // Last resort: show the data in a prompt for manual copying
      window.prompt('Copy the group names below (Ctrl+C/Cmd+C):', groupNames)
      
    } catch (error) {
      console.error('Failed to copy group names to clipboard:', error)
      
      // Last resort: show the data in a prompt for manual copying
      const groupNames = groupData.value.map(group => group.name).join('\n')
      window.prompt('Copy the group names below (Ctrl+C/Cmd+C):', groupNames)
    }
  }

  // Helper function to format date/time for trip data
  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  // Lifecycle
  onMounted(async () => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    // Load GEOtab status
    loadGEOtabStatus()

    // Load available snapshots and polling status
    loadAvailableSnapshots()
    loadPollingStatus()

    // Automatically load latest cache data on page load
    try {
      console.log('[GEOTAB] Auto-loading latest cache data on page mount...')
      
      // Load in parallel for better performance
      await Promise.all([
        loadGroupData(),
        loadDriverData(), 
        loadDeviceData()
      ])
      
      console.log('[GEOTAB] Successfully auto-loaded all cache data')
    } catch (error) {
      console.warn('[GEOTAB] Failed to auto-load some cache data:', error)
      // Don't block page loading if cache fails
    }

    // Set up countdown timer (update every second)
    countdownInterval = setInterval(updateCountdown, 1000)

    // Listen for GEOtab authentication events
    if (typeof window !== 'undefined') {
      window.addEventListener('geotabAuthenticated', handleGEOtabStatusChange)
    }

    // Auto-load cached data (don't trigger fresh API calls on page load)
    await refreshRealTimeData(false) // false = don't force refresh, use cached data only
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('geotabAuthenticated', handleGEOtabStatusChange)
    }
    // Clear countdown timer
    if (countdownInterval) {
      clearInterval(countdownInterval)
    }
  })
</script>

<style scoped>
  .elevation-1 {
    box-shadow: 0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12) !important;
  }

  .snapshot-card {
    cursor: pointer;
    transition: transform 0.2s ease-in-out;
  }

  .snapshot-card:hover {
    transform: translateY(-2px);
  }

  .font-mono {
    font-family: 'Courier New', Courier, monospace;
  }
</style>