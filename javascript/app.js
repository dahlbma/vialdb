(function() {
    var gData =  {"locDescription":"",
    		  "locId":"",
		  "boxes":[],
		  "boxDescription":"",
		  "boxId":"",
		  "boxContent":[],
		  "vials":[],
		  "locationTypes":[]};

    // create the module and name it App
    var App = angular.module('App', ['ngRoute', 'ui.grid', 'ui.grid.edit', 'ui.grid.rowEdit',
				     'ui.grid.cellNav', 'ui.grid.selection', 'ui.grid.exporter']);

    /////////////////////////////////////////////////////////////////////////////////////

    App.controller('mainController', function($http) {
	this.data = gData;
	this.gridOptions = {};
	var localThis = this;

	$http.get('/getVialTypes').success(function(data){
	    localThis.data.locationTypes = data;
	});

	$http.get('/getLocations').success(function(data){
	    localThis.data.locations = data;
	})
    });

    /////////////////////////////////////////////////////////////////////////////////////////
    // Locations
    App.controller('searchLocationController', function($scope, $http) {
	this.data = gData;
	var localThis = this;
	this.sLocation = ""
	this.searchLoc = function(locations){
	    $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
	    $http({url:'/searchLocation/' + localThis.sLocation,
		   method:'GET'
		  })
		.success(function(data){
		    localThis.data.boxes = data;
		    localThis.data.locId = data.boxId;
		    // Reset form
		    localThis.location = "";
		});
	}
    });

    /////////////////////////////////////////////////////////////////////////////////////

    App.controller('addLocationController', function($scope, $http) {
	this.location = {"locDescription":"",
    			 "locId":""};
	this.data = gData;
	this.sDescription = "";
	var localThis = this;

	this.addLoc = function(locations){
	    $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
	    $http({url:'/createLocation',
		   method:'POST',
		   data:$.param({'description':localThis.sDescription})
		  })
		.success(function(data){
		    localThis.data.locId = data.locId;
		    localThis.data.locDescription = data.locDescription;

		    // Update the list of locations (with the newly created one)
		    $http.get('/getLocations').success(function(data){
			localThis.data.locations = data;
		    });
		    // Reset the form
		    localThis.sDescription = ""
		});
	}
    });
    
    /////////////////////////////////////////////////////////////////////////////////////////
    // Boxes
    App.controller('searchBoxController', function($scope, $http, $routeParams, $q, $timeout) {
	this.data = gData;
	this.sVial = "";
	this.sBoxType = ""
	this.disableButtons = true;
	this.sBox = ""
	this.sBoxInfo = ""
	this.sMessage = ""
	this.gridOptions = {rowEditWaitInterval: 10,
			    enableSorting:false,
			   rowHeight:18};
 	this.gridOptions.columnDefs = [
	    { name: 'vialId', enableCellEdit: false },
	    { name: 'batchId', displayName: 'Batch Id', enableCellEdit: false },
	    { name: 'compoundId', displayName: 'Compound Id', enableCellEdit: false },
	    { name: 'coordinate', displayName: 'Coordinate' , type: 'number', enableCellEdit: false}
	];
	var localThis = this;

	this.printClick = function(){
 	    $http({url:'/printBox/' + localThis.sBox,
		   method:'GET'
		  });
	};

	this.keyPress = function(keyEvent){
	    if (keyEvent.which < 40) {
		return;
	    };
	    localThis.sVial += String.fromCharCode(keyEvent.which).toUpperCase();
	    if (localThis.sVial.search(/v\d\d\d\d\d\dv/i)=== 0){
		localThis.sVial = 'V';
		return;
	    };
	    if (localThis.sVial.search(/v\d\d\d\d\d(\d|\d\d)/i) === 0){
		var saRow = localThis.gridApi.cellNav.getFocusedCell().row;
		if (localThis.saveRow(saRow.entity)){
		    localThis.sVial = '';
		};
	    };
	    if (localThis.sVial.length > 7){
		localThis.sVial = '';
	    }
	};

	this.boxChange = function(){
	    if (typeof localThis.sBox != 'undefined'){
		if (localThis.sBox.search(/db\d\d\d\d\d/i) === 0){
		    localThis.searchBox(localThis.sBox);
		} else {
		    localThis.sBoxInfo = "";
		};
	    } else {
		localThis.sBoxInfo = "";
	    };
	};

	this.resetOldPosition = function(sVial){
	    for (var iRow = 0; iRow < localThis.gridOptions.data.length; iRow++){
		if(localThis.gridOptions.data[iRow].vialId === sVial){
		    localThis.gridOptions.data[iRow].vialId = null;
		    localThis.gridOptions.data[iRow].batchId = null;
		    localThis.gridOptions.data[iRow].compoundId = null;
		};
	    };
	};

	//////////////////////////////////////////////////////////////////////////////////////////////
	// Grid stuff

	this.saveRow = function( rowEntity ) {
	    //console.log("Saving vial " + rowEntity.vialId +  ' ' + rowEntity.coordinate);
	    var promise = $q.defer();
	    console.log(rowEntity)
	    localThis.gridApi.rowEdit.setSavePromise(rowEntity, promise.promise);
	    $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
	    $http({url:'/updateVialPosition',
		   method:'POST',
		   data:$.param({'vialId':localThis.sVial,
				 'boxId':localThis.sBox,
				 'coordinate':rowEntity.coordinate})
		  })
		.success(function(data){
		    localThis.resetOldPosition(data[0].vialId);
		    localThis.gridOptions.data[rowEntity.coordinate-1] = data[0];

		    localThis.gridApi.cellNav.scrollToFocus(localThis.gridOptions.data[rowEntity.coordinate],
							    localThis.gridOptions.columnDefs[0]);

		    promise.resolve();
		    return true;
		})
		.error(function(data){
		    console.log("Error")
		    //alert(data[0].message)
		    localThis.sMessage = data[0].message;
		    localThis.showMessage = true;
		    $timeout(function() {
			localThis.showMessage = false;
		    }, 4000);
		    promise.reject();
		    return false;
		});
	};
	
	this.gridOptions.onRegisterApi = function(gridApi){
	    //set gridApi on scope
	    localThis.gridApi = gridApi;
	    gridApi.rowEdit.on.saveRow($scope, localThis.saveRow);
	};

	this.searchBox = function(boxes){
	    $http.get('/updateBox/' + localThis.sBox)
		.success(function(data) {
		    localThis.gridOptions.data = data[0].data;
		    localThis.sMessage = "";
		    localThis.sBoxInfo = data[0].message;
		    localThis.disableButtons = false;
		})
		.error(function(data) {
		    localThis.disableButtons = true;
		    localThis.gridOptions.data = {};
		    localThis.sBoxInfo = "";
		    localThis.sMessage = "Box not found";
		    localThis.showMessage = true;
		    $timeout(function() {
			localThis.showMessage = false;
		    }, 3000);
		});
	};

	// Grid stuff
	/////////////////////////////////////////////////////////////////////////////////////////////

    });

    /////////////////////////////////////////////////////////////////////////////////////

    App.controller('addBoxController', function($scope, $http) {
	this.data = gData;
	this.sDescription = ""
	this.sBoxType = ""
	var localThis = this;
	console.log(gData)
	this.addBox = function(boxes){
	    $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
	    $http({url:'/createBox',
		   method:'POST',
		   data:$.param({'type':localThis.sBoxType.vial_type_desc,
   				 'description':localThis.sDescription,
				 'location':localThis.sLocation.location_id})
		  })
		.success(function(data){
		    localThis.data.boxId = data.boxId;
		    localThis.data.boxDescription = data.boxDescription;
		    
		    // Reset the form
		    localThis.sDescription = ""
		    localThis.sBoxType = localThis.data.locationTypes[0]
		    localThis.sLocation = localThis.data.locations[0]
		});
	}
    });
    
    /////////////////////////////////////////////////////////////////////////////////////

    App.controller('searchVialsController', function($scope, $http) {
	this.data = gData;
	this.sVials = ""

	this.gridOptions = {enableSorting:false,
			    enableGridMenu: true,
			    exporterPdfDefaultStyle: {fontSize: 9},
			    exporterPdfTableStyle: {margin: [10, 10, 10, 10]},
			    exporterPdfOrientation: 'landscape',
			    exporterPdfPageSize: 'A4'};
 	this.gridOptions.columnDefs = [
	    { name: 'vialId', enableCellEdit: false },
	    { name: 'boxId', displayName: 'Box Desc', enableCellEdit: false },
	    { name: 'coordinate', displayName: 'Coordinate' , type: 'number', enableCellEdit: false},
	    { name: 'batchId', displayName: 'Batch Id', enableCellEdit: false },
	    { name: 'compoundId', displayName: 'Compound Id', enableCellEdit: false },
	    { name: 'cbkId', displayName: 'CBK Id', enableCellEdit: false },
	    { name: 'batchMolWeight', displayName: 'Batch Mol Weight', enableCellEdit: false },
	    { name: 'salt', displayName: 'Salt', enableCellEdit: false },
	    { name: 'dilution', displayName: 'Dilution', enableCellEdit: false },
	];

	var localThis = this;
	this.searchVials = function(stuff) {
	    $http.get('/searchVials/' + localThis.sVials)
		.success(function(data){
		    localThis.gridOptions.data = data;
		})
		.error(function(data){
		    localThis.gridOptions.data = data;		    
		});
	};
    }); // searchVialsController


    /////////////////////////////////////////////////////////////////////////////////////

    App.controller('searchVialController', function($http, $scope, $timeout) {
	this.data = gData;
	this.sVial = "";
	this.data = {};
	this.sMessage = '';
	this.disableButtons = true;
	localThis = this;
        this.saLocations = null;
        this.oldLoc = "";
        this.newLoc = "";
	this.data.coordinate = null;
        localThis.sStrings = {};
        localThis.sStrings.orEmpty = function( entity ) {
            return entity || "";
	};

        this.getLocations = function(){
            $http({url:'/getLocation',
                   method:'GET'
                  })
                .success(function(data){
                    localThis.saLocations = data;
		});
        };
        this.getLocations();
	this.updateLocation = function(sThisUser){
            $http({url:'/moveVialToLocation/' + localThis.sVial + '/' + sThisUser,
                   method:'GET'
                  })
                .success(function(data){
                    localThis.sUser = null;
                    localThis.oldLoc = localThis.sStrings.orEmpty(localThis.data.coordinate) + ' ' +
                        localThis.sStrings.orEmpty(localThis.data.checkedout)
                    localThis.newLoc = "tmp";
                    localThis.vialChange();
                    localThis.showMoved = true;
		    localThis.sLocation = localThis.saLocations[0]
                });
        };



	this.printClick = function(){
 	    $http({url:'/printVial/' + localThis.sVial,
		   method:'GET'
		  });
	};
	this.discardClick = function(){
 	    $http({url:'/discardVial/' + localThis.sVial,
		   method:'GET'
		  })
		.success(function(data){
		    localThis.vialChange();
		});
	};

	this.vialChange = function(){
	    if (typeof localThis.sVial != 'undefined'){
		localThis.sMessage = '';
		if (localThis.sVial.search(/v\d\d\d\d\d(\d|\d\d)/i) === 0){
		    localThis.sLocation = localThis.saLocations[0]

		    $http({url:'/vialInfo/' + localThis.sVial,
			   method:'GET'
			  })
			.success(function(data){
			    localThis.disableButtons = false;
			    localThis.data = data[0];
                            if (localThis.oldLoc === "" || localThis.newLoc === ""){
                                localThis.showMoved = false;
                            };

                            //localThis.newLoc = localThis.sStrings.orEmpty(localThis.data.box_id) + ' ' +
	                    //    localThis.sStrings.orEmpty(localThis.data.coordinate) + ' ' +
                            //    localThis.sStrings.orEmpty(localThis.data.checkedout)

                            localThis.newLoc = localThis.sStrings.orEmpty(localThis.data.box_id) + ' ' +
                                localThis.sStrings.orEmpty(localThis.data.checkedout) +
				localThis.sStrings.orEmpty(localThis.data.discarded)

                            localThis.sMoved = "Moved " + localThis.sVial + ' from ' +
				localThis.oldLoc + ' to ' + localThis.newLoc;

			    localThis.data.box_id = localThis.newLoc;
                            localThis.newLoc = "";
			    if(localThis.data.discarded === 'Discarded' &&
			      localThis.data.box_id === null){
				localThis.data.box_id = 'Discarded';
			    };
			})
			.error(function(data){		
			    this.disableButtons = true;
			    localThis.sMessage = 'Vial not found';
			    localThis.data = {};
			    localThis.showMessage = true;
			    $timeout(function() {
				localThis.showMessage = false;
			    }, 4000);

			});
		} else {
		    this.disableButtons = true;
		    localThis.data = {};
		};
	    }else {
		this.disableButtons = true;
		localThis.data = {};
	    };
	};
    }); // searchVialController
    
    /////////////////////////////////////////////////////////////////////////////////////

    App.controller('editVialController', function($http, $scope, $timeout) {
	this.data = gData;
	this.lNormal = true;
	this.sMessage = null;
	this.formData = {
	    'sVial' : "",
	    'sBoxType' : {},
	    'iNetWeight' : null,
	    'iGross' : null,
	    'iDilutionFactor': null,
	    'tare': null
	};
	
	this.resetForm = function(sVial, sBatch){
	    localThis.formData.sVial = sVial;
	    localThis.formData.batch_id = sBatch;
	    localThis.formData.compound_id = null;
	    localThis.formData.batch_formula_weight = null;
	    localThis.formData.iGross = null;
	    localThis.formData.iDilutionFactor = null;
	    localThis.formData.iNetWeight = null;
	    localThis.formData.tare = null;
	};
	var localThis = this;
	localThis.vialInfo = null;

	localThis.getLocType = function(vial_type){
	    for (var i=0; i< localThis.data.locationTypes.length; i++) {
		if (localThis.data.locationTypes[i].vial_type === vial_type){
		    return localThis.data.locationTypes[i];
		};
	    };
	};

	this.vialChange = function(){
	    if (typeof localThis.formData.sVial != 'undefined'){
		if (localThis.formData.sVial.search(/v\d\d\d\d\d(\d|\d\d)/i) === 0){
		    $http({url:'/verifyVial/' + localThis.formData.sVial,
			   method:'GET'
			  })
			.success(function(data){
			    localThis.formData = data[0];
			    localThis.formData.sBoxType = localThis.getLocType(data[0].vial_type);
			    localThis.sMessage = null;
			    document.getElementById("gross_weight").focus();
			})
			.error(function(data){
			    localThis.sMessage = data;
			});
		}
	    }
	};

	this.printVial = function(){
	    console.log("Print vial");
	    $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
	    $http({url:'/printVial/' + localThis.formData.sVial,
		   method:'GET'
		  })
		.success(function(data){
		    localThis.lNormal = true;
		    localThis.sMessage = "Label printed for " + localThis.formData.sVial;
		    localThis.resetForm();
		    localThis.updatedVialType();
		    $timeout(function() {
			localThis.sMessage = "";
		    }, 5000);		    
		})
	};

	this.editVial = function(){
	    $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
	    $http({url:'/editVial',
		   method:'POST',
		   data:$.param(localThis.formData)
		  })
		.success(function(data){
		    localThis.lNormal = false;
		    localThis.sMessage = "Vial created";
		    $timeout(function() {
			localThis.sMessage = "";
		    }, 5000);
		})
		.error(function(data){
		    localThis.formData = {};
		});
	};
	this.batchChange = function(){
	    
	    if (typeof localThis.formData.batch_id != 'undefined'){
		$http({url:'/batchInfo/' + localThis.formData.batch_id,
		       method:'GET'
		      })
		    .success(function(data){
			console.log(data[0]);
			localThis.formData.compound_id = data[0].compound_id
			localThis.formData.batch_formula_weight = data[0].batch_formula_weight
		    })
		    .error(function(data){
			localThis.formData.compound_id = null;
			localThis.formData.batch_formula_weight = null;
		    });
	    } else {
		localThis.formData.iGross = null;
		localThis.formData.iNetWeight = null;
	    };
	};

	this.updatedVialType = function(){
	    $http({url:'/getBoxOfType/' + localThis.formData.sBoxType.vial_type,
		   method:'GET'
		  })
		.success(function(data){
		    if(localThis.formData.iGross !== null){
			localThis.grossChange();
		    };
		})
		.error(function(data){
		    localThis.resetForm(true);
		});	    
	};

	this.grossChange = function(as){
	    try{
		var fTmp = parseFloat(localThis.formData.iGross) - parseFloat(localThis.formData.tare);
	    } catch(err){
		localThis.formData.iNetWeight = null;
		return;
	    };
	    localThis.formData.iNetWeight = fTmp.toFixed(5);
	    var batch_formula_weight = parseFloat(localThis.formData.batch_formula_weight);
	    var concentration = parseFloat(localThis.formData.sBoxType.concentration);
	    localThis.formData.iDilutionFactor = (((localThis.formData.iNetWeight*1000/batch_formula_weight)/concentration)*1000000).toFixed(2);
	};

    }); // editVialController
    
    /////////////////////////////////////////////////////////////////////////////////////

    App.controller('checkinVialController', function($http, $scope) {
	this.data = gData;
	this.sBoxType = "";
	this.iNetWeight = null;
	this.iGross = null;
	this.sMessage = null;
	var localThis = this;
	localThis.vialInfo = null;

	this.resetForm = function(lDeleteVial){
	    if(lDeleteVial === true){localThis.sVial = null;};
	    localThis.vialInfo = null;
	    localThis.iGross = null;
	    localThis.iNetWeight = null;
	    localThis.sMessage = null;
	    localThis.iDilutionFactor = null;
	};
	this.grossChange = function(as){
	    try{
		var fTmp = parseFloat(localThis.iGross) - parseFloat(localThis.vialInfo.tare);
	    } catch(err){
		localThis.iNetWeight = null;
		return;
	    };
	    localThis.iNetWeight = fTmp.toFixed(5);
	    var batch_formula_weight = parseFloat(localThis.vialInfo.batch_formula_weight);
	    var concentration = parseFloat(localThis.sBoxType.concentration);
	    localThis.iDilutionFactor = (((localThis.iNetWeight*1000/batch_formula_weight)/concentration)*1000000).toFixed(2);
	};

	this.updatedVialType = function(){
	    $http({url:'/getBoxOfType/' + localThis.sBoxType.vial_type,
		   method:'GET'
		  })
		.success(function(data){
		    if(localThis.iGross !== null){
			localThis.grossChange();
		    };
		})
		.error(function(data){
		    localThis.resetForm(true);
		});	    
	};
	
	this.vialChange = function(){
	    if (typeof localThis.sVial != 'undefined'){
		if (localThis.sVial.search(/v\d\d\d\d\d(\d|\d\d)/i) === 0){
		    $http({url:'/verifyVial/' + localThis.sVial,
			   method:'GET'
			  })
			.success(function(data){
			    localThis.vialInfo = data[0];
			    //localThis.updatedVialType();
			    localThis.sMessage = null;
			    document.getElementById("gross_weight").focus();
			})
			.error(function(data){
			    localThis.resetForm(false);
			    localThis.sMessage = data;
			});
		} else {
		    localThis.resetForm(false);
		};
	    } else {
		localThis.resetForm(false);		
		localThis.sMessage = "";
	    };
	};
	
	this.checkinVial = function(stuff){
	    $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
	    $http({url:'/checkinVial',
		   method:'POST',
		   data:$.param({'vial_id':localThis.vialInfo.vial_id,
   				 'batch_id':localThis.vialInfo.batch_id,
				 'compound_id':localThis.vialInfo.compound_id,
				 'vial_type':localThis.sBoxType.vial_type,
				 'gross_weight':localThis.iGross,
				 'net_weight':localThis.iNetWeight})
		  })
		.success(function(data){
		    localThis.sMessage = "Updated " + localThis.vialInfo.vial_id;
		    // Reset the form
		    localThis.resetForm(true);
		    document.getElementById("vial_id_input").focus();
		});
	}
    }); // checkinVialController

    ////////////////////////////////////////////////////////////////////////////
    /// Tare File upload

    App.directive('fileModel', ['$parse', function ($parse) {
	return {
            restrict: 'A',
            link: function(scope, element, attrs) {
		var model = $parse(attrs.fileModel);
		var modelSetter = model.assign;
		
		element.bind('change', function(){
                    scope.$apply(function(){
			modelSetter(scope, element[0].files[0]);
                    });
		});
            }
	};
    }]);

    App.service('fileUpload', ['$http', function ($http) {
	this.uploadFileToUrl = function(file, uploadUrl, $scope){
            var fd = new FormData();
            fd.append('file', file);
            $http.post(uploadUrl, fd, {
		transformRequest: angular.identity,
		headers: {'Content-Type': undefined}
            })
		.success(function(data){
		    $scope.saFailedVials = data;
		})
		.error(function(){
		});
	}
    }]);

    /////////////////////////////////////////////////////////////////////////////////////

    App.controller('createEmptyVialsNLabelsController', function($scope, $http){
	this.data = gData;
	this.gridOptions = {};
	this.sBoxType = null;
	this.numberOfVials = null;
	this.invalidDigit = true;
	var localThis = this;

	localThis.onlyDigits = function(){
	    var x = Number(localThis.numberOfVials);
	    if (isNaN(x) || (x > 200)) {
		localThis.invalidDigit = true;
		console.log("Not a number");
		return;
	    };
	    localThis.invalidDigit = false;
	};

	localThis.execCreateVials = function(){
	    console.log(localThis.sBoxType);
	    console.log(localThis.numberOfVials)
	    $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
	    $http({url:'/createManyVialsNLabels',
		   method:'POST',
		   data:$.param({'vialType':localThis.sBoxType.vial_type,
				'numberOfVials':localThis.numberOfVials})
		  })
		.success(function(data){
		    console.log(data);
		})

	};

    }); // createEmptyVialsNLabelsController

    /////////////////////////////////////////////////////////////////////////////////////

    App.controller('uploadEmptyVialController', ['$scope', 'fileUpload', function($scope, fileUpload){
	$scope.saFailedVials = null;
	$scope.saFailedVialsOrig = angular.copy($scope.saFailedVials);

	$scope.uploadFile = function(){
            var file = $scope.myFile;
            console.log('file is ' + JSON.stringify(file));
            var uploadUrl = "/uploadEmptyVials";
            fileUpload.uploadFileToUrl(file, uploadUrl, $scope);
	    $scope.saFailedVials = null;
	};
    }]);

    /// Tare File upload
    ////////////////////////////////////////////////////////////////////////////

    App.controller('getMicrotubesController', function($scope, $http) {
	this.data = gData;
	this.sBatches = ""
	this.showSpinner = 'no-spinner';
	this.gridOptions = {enableSorting:false,
			    enableGridMenu: true,
			    exporterPdfDefaultStyle: {fontSize: 9},
			    exporterPdfTableStyle: {margin: [10, 10, 10, 10]},
			    exporterPdfOrientation: 'landscape',
			    exporterPdfPageSize: 'A4'};
 	this.gridOptions.columnDefs = [
	    { name: 'batchId', displayName: 'Batch Id', width:100, enableCellEdit: false },
	    { name: 'tubeId', displayName: 'Tube Id', width:100, enableCellEdit: false },
	    { name: 'volume', displayName: 'Volume', width:80, type: 'number', enableCellEdit: false},
	    { name: 'matrixId', displayName: 'Matrix Id', width:80, enableCellEdit: false },
	    { name: 'position', displayName: 'Position', width:80, enableCellEdit: false },
	    { name: 'location', displayName: 'Location', enableCellEdit: false, cellClass: 'grid-align-left'},
	];

	var localThis = this;
	this.getMicrotubes = function(stuff) {
	    localThis.showSpinner = 'spinner';
	    $http.get('/getMicroTubeByBatch/' + localThis.sBatches)
		.success(function(data){
		    localThis.gridOptions.data = data;
		    localThis.showSpinner = 'no-spinner';
		})
		.error(function(data){
		    localThis.gridOptions.data = data;		    
		    localThis.showSpinner = 'no-spinner';
		});
	};
    }); // getMicrotubesController

    ////////////////////////////////////////////////////////////////////////////

    App.controller('getRackController', function($scope, $http) {
	this.data = gData;
	this.sRack = ""
	this.showSpinner = 'no-spinner';
	this.gridOptions = {enableSorting:true,
			    enableGridMenu: true,
			    exporterPdfDefaultStyle: {fontSize: 9},
			    exporterPdfTableStyle: {margin: [10, 10, 10, 10]},
			    exporterPdfOrientation: 'landscape',
			    exporterPdfPageSize: 'A4'};
 	this.gridOptions.columnDefs = [
	    { name: 'iRow', displayName: '#', width:30, enableCellEdit: false },
	    { name: 'batchId', displayName: 'Batch Id', width:100, enableCellEdit: false },
	    { name: 'compoundId', displayName: 'Compound Id', width:100, enableCellEdit: false },
	    { name: 'ssl', displayName: 'SSL Id', width:80, enableCellEdit: false },
	    { name: 'tubeId', displayName: 'Tube Id', width:100, enableCellEdit: false },
	    { name: 'volume', displayName: 'Volume', width:80, type: 'number', enableCellEdit: false},
	    { name: 'conc', displayName: 'Concentration', width:100, enableCellEdit: false },
	    { name: 'position', displayName: 'Position', enableSorting: true, width:80, enableCellEdit: false },
	    { name: 'location', displayName: 'Location', enableCellEdit: false, cellClass: 'grid-align-left'},
	];

	var localThis = this;
	this.getRack = function(stuff) {
	    localThis.showSpinner = 'spinner';
	    $http.get('/getRack/' + localThis.sRack)
		.success(function(data){
		    localThis.gridOptions.data = data;
		    localThis.showSpinner = 'no-spinner';
		})
		.error(function(data){
		    localThis.gridOptions.data = null;
		    localThis.showSpinner = 'no-spinner';
		});
	};
    }); // getRackController

    /////////////////////////////////////////////////////////////////////////////////////

    App.directive('rackModel', ['$parse', function ($parse) {
	return {
            restrict: 'A',
            link: function(scope, element, attrs) {
		var model = $parse(attrs.rackModel);
		var modelSetter = model.assign;
		
		element.bind('change', function(){
                    scope.$apply(function(){
			modelSetter(scope, element[0].files[0]);
                    });
		});
            }
	};
    }]);

    App.service('rackUpload', ['$http', function ($http) {
	this.uploadFileToUrl = function(file, uploadUrl, $scope){
	    console.log('In here')
            var fd = new FormData();
            fd.append('file', file);
            $http.post(uploadUrl, fd, {
		transformRequest: angular.identity,
		headers: {'Content-Type': undefined}
            })
		.success(function(data){
		    $scope.saFailedTubes = data;
		})
		.error(function(){
		});
	}
    }]);

    App.controller('uploadMicrotubeRackController', ['$scope', 'rackUpload', function($scope, rackUpload){
	$scope.saFailedTubes = null;
	$scope.saFailedTubesOrig = angular.copy($scope.saFailedTubes);

	$scope.uploadFile = function(){
            var file = $scope.myFile;
            console.log('file is ' + JSON.stringify(file));
            var uploadUrl = "/readScannedRack";
            rackUpload.uploadFileToUrl(file, uploadUrl, $scope);
	    $scope.saFailedTubes = null;
	};
    }]);

    ////////////////////////////////////////////////////////////////////////////

    App.controller('searchBatchController', function($scope, $http) {
	this.data = gData;
	this.sBatch = ""

	this.gridOptions = {enableSorting:false,
			    enableGridMenu: true,
			    exporterPdfDefaultStyle: {fontSize: 9},
			    exporterPdfTableStyle: {margin: [10, 10, 10, 10]},
			    exporterPdfOrientation: 'landscape',
			    exporterPdfPageSize: 'A4'};
 	this.gridOptions.columnDefs = [
	    { name: 'vialId', enableCellEdit: false },
	    { name: 'boxId', displayName: 'Box Desc', enableCellEdit: false },
	    { name: 'coordinate', displayName: 'Coordinate' , type: 'number', enableCellEdit: false},
	    { name: 'batchId', displayName: 'Batch Id', enableCellEdit: false },
	    { name: 'compoundId', displayName: 'Compound Id', enableCellEdit: false },
	    { name: 'cbkId', displayName: 'CBK Id', enableCellEdit: false },
	    { name: 'batchMolWeight', displayName: 'Batch Mol Weight', enableCellEdit: false },
	    { name: 'salt', displayName: 'Salt', enableCellEdit: false },
	];

	var localThis = this;
	this.searchBatches = function(stuff) {
	    $http.get('/searchBatches/' + localThis.sBatches)
		.success(function(data){
		    localThis.gridOptions.data = data;
		})
		.error(function(data){
		    localThis.gridOptions.data = data;		    
		});
	};
    }); // searchBatchController

    ////////////////////////////////////////////////////////////////////////////
    // configure routes
    App.config(function($routeProvider) {
	
	$routeProvider
	    .when('/', {
		templateUrl : 'static/home.html',
		controller  : 'mainController'
	    })
	// Locations
	    .when('/addLocation', {
		templateUrl : 'static/addLocation.html',
		controller  : 'addLocationController'
	    })
	    .when('/searchLocation', {
		templateUrl : 'static/searchLocation.html',
		controller  : 'searchLocationController'
	    })
	// Boxes
	    .when('/addBox', {
		templateUrl : 'static/addBox.html',
		controller  : 'addBoxController'
	    })
	    .when('/updateBox/:sBox?', {
		templateUrl : 'static/updateBox.html',
		controller  : 'searchBoxController'
	    })
        // Vials
	    .when('/createEmptyVials', {
		templateUrl : 'static/uploadEmptyVialFile.html',
		controller  : 'uploadEmptyVialController'
	    })
	    .when('/searchVials', {
		templateUrl : 'static/searchVials.html',
		controller  : 'searchVialsController'
	    })
	    .when('/searchVial', {
		templateUrl : 'static/searchVial.html',
		controller  : 'searchVialController'
	    })
	    .when('/editVial', {
		templateUrl : 'static/editVial.html',
		controller  : 'editVialController'
	    })
	    .when('/createEmptyVialsNLabels', {
		templateUrl : 'static/createEmptyVialsNLabels.html',
		controller  : 'createEmptyVialsNLabelsController'
	    })
        // Microtubes
	    .when('/getMicrotubes', {
		templateUrl : 'static/getMicrotubes.html',
		controller  : 'getMicrotubesController'
	    })
	    .when('/getRack', {
		templateUrl : 'static/getRack.html',
		controller  : 'getRackController'
	    })
	    .when('/uploadMicrotubeRack', {
		templateUrl : 'static/uploadMicrotubeRack.html',
		controller  : 'uploadMicrotubeRackController'
	    })
	// Batches
	    .when('/searchBatches', {
		templateUrl : 'static/searchBatch.html',
		controller  : 'searchBatchController'
	    });
    });
})();
